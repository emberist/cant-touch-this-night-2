import { clickhouse } from "@/lib/clickhouse";
import {
  buildIdentityMappings,
  type GeneratedEvent,
  type GeneratedUser,
  type IdentityMapping,
  mulberry32,
} from "@/lib/seed";

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobStatus =
  | "queued"
  | "running"
  | "complete"
  | "failed"
  | "cancelled";

export type NumericVariance = "low" | "medium" | "high";

export interface EventTypeWeight {
  name: string;
  weight: number;
}

export interface JobConfig {
  total: number;
  users: number;
  start: string;
  end: string;
  event_types: EventTypeWeight[];
  identity_resolution: boolean;
  anonymous_ratio: number;
  numeric_variance: NumericVariance;
}

export interface JobConfigInput {
  total?: number;
  users?: number;
  start?: string;
  end?: string;
  event_types?: EventTypeWeight[];
  identity_resolution?: boolean;
  anonymous_ratio?: number;
  numeric_variance?: string;
}

export interface JobState {
  job_id: string;
  status: JobStatus;
  inserted: number;
  total: number;
  throughput: number;
  eta_seconds: number;
  elapsed_ms: number;
  error?: string;
  config: JobConfig;
  cancelled: boolean;
  created_at: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 10_000;

const DEFAULT_EVENT_TYPES: EventTypeWeight[] = [
  { name: "Page Viewed", weight: 0.4 },
  { name: "Button Clicked", weight: 0.15 },
  { name: "Signup Completed", weight: 0.12 },
  { name: "Purchase Completed", weight: 0.13 },
  { name: "Subscription Renewed", weight: 0.12 },
  { name: "Support Ticket Opened", weight: 0.08 },
];

const PAGES = [
  "/home",
  "/pricing",
  "/features",
  "/about",
  "/signup",
  "/login",
  "/dashboard",
];
const PLANS = ["free", "starter", "pro", "enterprise"];
const CURRENCIES = ["USD", "EUR", "GBP", "BTC"];
const SOURCES = ["organic", "paid", "referral", "email", "social"];
const BUTTON_NAMES = [
  "Get Started",
  "Sign Up",
  "Learn More",
  "Buy Now",
  "Upgrade",
  "Try Free",
];

// ─── In-memory job store ──────────────────────────────────────────────────────

const jobs = new Map<string, JobState>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickFrom<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function buildCumulative(weights: readonly number[]): number[] {
  const cum: number[] = [];
  let total = 0;
  for (const w of weights) {
    total += w;
    cum.push(total);
  }
  return cum;
}

function weightedIndex(cumulative: number[], rand: () => number): number {
  const r = rand() * cumulative[cumulative.length - 1];
  for (let i = 0; i < cumulative.length; i++) {
    if (r <= cumulative[i]) return i;
  }
  return cumulative.length - 1;
}

function getVarianceMultiplier(variance: NumericVariance): number {
  switch (variance) {
    case "low":
      return 0.2;
    case "medium":
      return 1.0;
    case "high":
      return 3.0;
  }
}

function generateProperties(
  eventName: string,
  rand: () => number,
  variance: NumericVariance,
): Record<string, unknown> {
  const vm = getVarianceMultiplier(variance);
  switch (eventName) {
    case "Page Viewed":
      return { page: pickFrom(PAGES, rand) };
    case "Button Clicked":
      return { button_name: pickFrom(BUTTON_NAMES, rand) };
    case "Signup Completed":
      return {
        plan: pickFrom(PLANS, rand),
        source: pickFrom(SOURCES, rand),
      };
    case "Purchase Completed":
      return {
        amount: Math.round(rand() * 500 * vm * 100) / 100,
        currency: pickFrom(CURRENCIES, rand),
        plan: pickFrom(PLANS, rand),
      };
    case "Subscription Renewed":
      return {
        amount: Math.round(rand() * 500 * vm * 100) / 100,
        currency: pickFrom(CURRENCIES, rand),
        plan: pickFrom(PLANS, rand),
      };
    case "Support Ticket Opened":
      return {
        ticket_count: Math.floor(rand() * 10 * vm) + 1,
        source: pickFrom(SOURCES, rand),
      };
    default:
      return {};
  }
}

/** Converts an ISO 8601 timestamp to the ClickHouse DateTime64 format. */
function toClickHouseTs(iso: string): string {
  return iso.replace("T", " ").replace("Z", "");
}

// ─── Config application and validation ───────────────────────────────────────

function applyDefaults(input: JobConfigInput): JobConfig {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const total = input.total ?? 10_000;
  const users = input.users ?? 100;
  const start = input.start ?? thirtyDaysAgo.toISOString().slice(0, 10);
  const end = input.end ?? now.toISOString().slice(0, 10);
  const event_types =
    input.event_types && input.event_types.length > 0
      ? input.event_types
      : DEFAULT_EVENT_TYPES;
  const identity_resolution = input.identity_resolution ?? true;
  const anonymous_ratio = input.anonymous_ratio ?? 30;
  const numeric_variance: NumericVariance =
    input.numeric_variance === "low" ||
    input.numeric_variance === "high" ||
    input.numeric_variance === "medium"
      ? input.numeric_variance
      : "medium";

  return {
    total,
    users,
    start,
    end,
    event_types,
    identity_resolution,
    anonymous_ratio,
    numeric_variance,
  };
}

function validateConfig(config: JobConfig): void {
  if (!Number.isInteger(config.total) || config.total < 1) {
    throw new Error("total must be an integer >= 1.");
  }
  if (config.total > 1_000_000) {
    throw new Error("total must be <= 1,000,000.");
  }
  if (!Number.isInteger(config.users) || config.users < 1) {
    throw new Error("users must be an integer >= 1.");
  }
  const startMs = new Date(config.start).getTime();
  const endMs = new Date(config.end).getTime();
  if (Number.isNaN(startMs)) {
    throw new Error("start must be a valid date string.");
  }
  if (Number.isNaN(endMs)) {
    throw new Error("end must be a valid date string.");
  }
  if (endMs <= startMs) {
    throw new Error("end must be after start.");
  }
}

// ─── User pool builder ────────────────────────────────────────────────────────

function buildUserPool(config: JobConfig, rand: () => number): GeneratedUser[] {
  const users: GeneratedUser[] = [];

  const anonCount = config.identity_resolution
    ? Math.round(config.users * (config.anonymous_ratio / 100))
    : config.users;
  const resolvedCount = config.users - anonCount;

  for (let i = 0; i < resolvedCount; i++) {
    users.push({
      type: "fully-resolved",
      userId: `gen-user-${i}@example.com`,
      deviceIds: [`gen-device-${i}`],
    });
  }

  for (let i = 0; i < anonCount; i++) {
    users.push({
      type: "anonymous",
      userId: null,
      deviceIds: [`gen-anon-${i}`],
    });
  }

  // Shuffle so anonymous users aren't always last (affects power-law weighting)
  for (let i = users.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [users[i], users[j]] = [users[j], users[i]];
  }

  return users;
}

// ─── Batch event generation ───────────────────────────────────────────────────

export function generateBatchEvents(
  config: JobConfig,
  users: GeneratedUser[],
  startDate: Date,
  endDate: Date,
  rand: () => number,
  batchSize: number,
): GeneratedEvent[] {
  const eventCumulative = buildCumulative(
    config.event_types.map((et) => et.weight),
  );
  const userWeights = users.map((_, i) => 1 / (i + 1) ** 1.5);
  const userCumulative = buildCumulative(userWeights);

  const startMs = startDate.getTime();
  const rangeMs = endDate.getTime() - startMs;

  const events: GeneratedEvent[] = [];

  for (let i = 0; i < batchSize; i++) {
    const user = users[weightedIndex(userCumulative, rand)];
    const eventTypeIdx = weightedIndex(eventCumulative, rand);
    const eventName = config.event_types[eventTypeIdx].name;

    const deviceId = pickFrom(user.deviceIds, rand);
    const tsMs = startMs + Math.floor(rand() * rangeMs);
    const timestamp = new Date(tsMs).toISOString();
    const properties = JSON.stringify(
      generateProperties(eventName, rand, config.numeric_variance),
    );

    events.push({
      event_name: eventName,
      timestamp,
      device_id: deviceId,
      user_id: user.userId,
      properties,
    });
  }

  return events;
}

// ─── Generation loop ──────────────────────────────────────────────────────────

async function runGenerationLoop(job_id: string): Promise<void> {
  const job = jobs.get(job_id);
  if (!job) return;

  job.status = "running";
  const startTime = Date.now();

  const { config } = job;
  const startDate = new Date(config.start);
  const endDate = new Date(config.end);

  // Use a deterministic seed derived from the job_id's first chars
  const seed =
    job_id
      .replace(/-/g, "")
      .slice(0, 8)
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0) | 0;
  const rand = mulberry32(seed);

  const userPool = buildUserPool(config, rand);

  let offset = 0;

  while (offset < config.total) {
    if (job.cancelled) {
      job.status = "cancelled";
      job.elapsed_ms = Date.now() - startTime;
      return;
    }

    const batchSize = Math.min(BATCH_SIZE, config.total - offset);
    const events = generateBatchEvents(
      config,
      userPool,
      startDate,
      endDate,
      rand,
      batchSize,
    );

    await clickhouse.insert({
      table: "events",
      values: events.map((e) => ({
        ...e,
        timestamp: toClickHouseTs(e.timestamp),
      })),
      format: "JSONEachRow",
    });

    offset += batchSize;
    job.inserted = offset;

    const elapsed = Date.now() - startTime;
    job.elapsed_ms = elapsed;
    job.throughput = elapsed > 0 ? Math.round((offset / elapsed) * 1000) : 0;
    const remaining = config.total - offset;
    job.eta_seconds =
      job.throughput > 0 ? Math.round(remaining / job.throughput) : 0;
  }

  // Insert identity mappings after all event batches are complete
  if (!job.cancelled) {
    const mappings: IdentityMapping[] = buildIdentityMappings(userPool);
    if (mappings.length > 0) {
      await clickhouse.insert({
        table: "identity_mappings",
        values: mappings,
        format: "JSONEachRow",
      });
    }

    job.elapsed_ms = Date.now() - startTime;
    job.throughput =
      job.elapsed_ms > 0
        ? Math.round((config.total / job.elapsed_ms) * 1000)
        : 0;
    job.eta_seconds = 0;
    job.status = "complete";
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validates config, creates a job in the in-memory store, kicks off the async
 * generation loop (fire-and-forget), and returns the job_id synchronously.
 *
 * Throws synchronously if the config is invalid.
 */
export function startGenerationJob(input: JobConfigInput): string {
  const config = applyDefaults(input);
  validateConfig(config);

  const job_id = crypto.randomUUID();
  const job: JobState = {
    job_id,
    status: "queued",
    inserted: 0,
    total: config.total,
    throughput: 0,
    eta_seconds: 0,
    elapsed_ms: 0,
    config,
    cancelled: false,
    created_at: Date.now(),
  };
  jobs.set(job_id, job);

  runGenerationLoop(job_id).catch((err: unknown) => {
    const j = jobs.get(job_id);
    if (j && j.status !== "cancelled") {
      j.status = "failed";
      j.error = err instanceof Error ? err.message : String(err);
    }
  });

  return job_id;
}

/** Returns the current JobState for the given job_id, or undefined if not found. */
export function getJob(id: string): JobState | undefined {
  return jobs.get(id);
}

/**
 * Sets the cancellation flag on a job. The generation loop checks this flag
 * between batches and will stop after the current batch completes.
 *
 * Returns true if the job was found, false otherwise.
 */
export function cancelJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job) return false;
  job.cancelled = true;
  return true;
}

/** Returns all jobs in the in-memory store. */
export function listJobs(): JobState[] {
  return [...jobs.values()];
}

// ─── Testing helpers ──────────────────────────────────────────────────────────

/** Clears all jobs from the in-memory store. For use in unit tests only. */
export function _clearJobs(): void {
  jobs.clear();
}
