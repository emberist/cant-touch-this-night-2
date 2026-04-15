import { clickhouse } from "@/lib/clickhouse";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserType = "fully-resolved" | "multi-device" | "anonymous";

export interface GeneratedUser {
  type: UserType;
  userId: string | null;
  deviceIds: string[];
}

export interface GeneratedEvent {
  event_name: string;
  timestamp: string;
  device_id: string | null;
  user_id: string | null;
  properties: string;
}

export interface IdentityMapping {
  device_id: string;
  user_id: string;
}

export interface SeedResult {
  events: number;
  users: number;
}

type ClickHouseClientLike = typeof clickhouse;

// ─── PRNG ─────────────────────────────────────────────────────────────────────

/**
 * mulberry32 — fast seeded PRNG that returns values in [0, 1).
 * Provides reproducible distributions when given the same seed.
 */
export function mulberry32(seed: number): () => number {
  let s = seed;
  return (): number => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SEED = 42;
const TARGET_EVENTS = 12_000;

const EVENT_NAMES = [
  "Page Viewed",
  "Button Clicked",
  "Signup Completed",
  "Purchase Completed",
  "Subscription Renewed",
  "Support Ticket Opened",
] as const;

type EventName = (typeof EVENT_NAMES)[number];

// Page Viewed targets ~40%; remaining 60% split across 5 other event types
const EVENT_WEIGHTS = [0.4, 0.15, 0.12, 0.13, 0.12, 0.08];

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

// ─── Property generation ──────────────────────────────────────────────────────

function generateProperties(
  eventName: EventName,
  rand: () => number,
): Record<string, unknown> {
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
        amount: Math.round(rand() * 500 * 100) / 100,
        currency: pickFrom(CURRENCIES, rand),
        plan: pickFrom(PLANS, rand),
      };
    case "Subscription Renewed":
      return {
        amount: Math.round(rand() * 500 * 100) / 100,
        currency: pickFrom(CURRENCIES, rand),
        plan: pickFrom(PLANS, rand),
      };
    case "Support Ticket Opened":
      return {
        ticket_count: Math.floor(rand() * 10) + 1,
        source: pickFrom(SOURCES, rand),
      };
    default: {
      const _exhaustive: never = eventName;
      void _exhaustive;
      return {};
    }
  }
}

// ─── User generation ──────────────────────────────────────────────────────────

/**
 * Generates 70 seed users:
 * - 50 fully-resolved (1 device + 1 user_id)
 * - 10 multi-device (2–3 devices + 1 user_id)
 * - 10 anonymous-only (1 device, no user_id)
 */
export function generateUsers(seed: number = DEFAULT_SEED): GeneratedUser[] {
  const rand = mulberry32(seed);
  const users: GeneratedUser[] = [];

  // 50 fully-resolved users
  for (let i = 0; i < 50; i++) {
    users.push({
      type: "fully-resolved",
      userId: `user-${String(i).padStart(4, "0")}@example.com`,
      deviceIds: [`device-${String(i).padStart(4, "0")}`],
    });
  }

  // 10 multi-device users (2–3 devices each, determined by PRNG)
  for (let i = 0; i < 10; i++) {
    const deviceCount = rand() < 0.5 ? 2 : 3;
    const deviceIds: string[] = [];
    for (let d = 0; d < deviceCount; d++) {
      deviceIds.push(`device-multi-${i}-${d}`);
    }
    users.push({
      type: "multi-device",
      userId: `multi-user-${i}@example.com`,
      deviceIds,
    });
  }

  // 10 anonymous-only users
  for (let i = 0; i < 10; i++) {
    users.push({
      type: "anonymous",
      userId: null,
      deviceIds: [`anon-device-${i}`],
    });
  }

  return users;
}

// ─── Identity mapping builder ─────────────────────────────────────────────────

/**
 * Returns one IdentityMapping row per device for every non-anonymous user.
 */
export function buildIdentityMappings(
  users: GeneratedUser[],
): IdentityMapping[] {
  const mappings: IdentityMapping[] = [];
  for (const user of users) {
    if (user.userId === null) continue;
    for (const deviceId of user.deviceIds) {
      mappings.push({ device_id: deviceId, user_id: user.userId });
    }
  }
  return mappings;
}

// ─── Event generation ─────────────────────────────────────────────────────────

/**
 * Generates TARGET_EVENTS events distributed across the given date range.
 *
 * User activity follows a power-law (Zipf-like) distribution so that a few
 * users are highly active and most are occasional. Event types are sampled
 * according to EVENT_WEIGHTS, targeting ~40% "Page Viewed".
 */
export function generateEvents(
  users: GeneratedUser[],
  startDate: Date,
  endDate: Date,
  seed: number = DEFAULT_SEED + 1,
): GeneratedEvent[] {
  const rand = mulberry32(seed);

  // Power-law activity weights: weight_i ∝ 1 / (rank+1)^1.5
  const userWeights = users.map((_, i) => 1 / (i + 1) ** 1.5);
  const userCumulative = buildCumulative(userWeights);
  const eventCumulative = buildCumulative(EVENT_WEIGHTS);

  const startMs = startDate.getTime();
  const rangeMs = endDate.getTime() - startMs;

  const events: GeneratedEvent[] = [];

  for (let i = 0; i < TARGET_EVENTS; i++) {
    const user = users[weightedIndex(userCumulative, rand)];
    const eventName = EVENT_NAMES[weightedIndex(eventCumulative, rand)];

    const deviceId = pickFrom(user.deviceIds, rand);
    const tsMs = startMs + Math.floor(rand() * rangeMs);
    const timestamp = new Date(tsMs).toISOString();
    const properties = JSON.stringify(generateProperties(eventName, rand));

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

// ─── seedData ─────────────────────────────────────────────────────────────────

/**
 * Clears existing data and populates ClickHouse with realistic sample data.
 *
 * Truncates `events` and `identity_mappings`, then bulk-inserts
 * ~12,000 events and the corresponding identity mappings for the
 * 60 non-anonymous seed users.
 */
export async function seedData(
  client: ClickHouseClientLike = clickhouse,
): Promise<SeedResult> {
  await client.command({ query: "TRUNCATE TABLE events" });
  await client.command({ query: "TRUNCATE TABLE identity_mappings" });

  const users = generateUsers();
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const events = generateEvents(users, startDate, endDate);
  const mappings = buildIdentityMappings(users);

  await client.insert({
    table: "events",
    values: events.map((e) => ({
      ...e,
      // ClickHouse JSONEachRow rejects ISO 8601 "T"/"Z" for DateTime64;
      // requires "YYYY-MM-DD HH:MM:SS.mmm" (space separator, no Z).
      timestamp: e.timestamp.replace("T", " ").replace("Z", ""),
    })),
    format: "JSONEachRow",
  });

  await client.insert({
    table: "identity_mappings",
    values: mappings,
    format: "JSONEachRow",
  });

  return {
    events: events.length,
    users: users.filter((u) => u.userId !== null).length,
  };
}
