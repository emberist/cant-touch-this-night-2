import { clickhouse } from "@/lib/clickhouse";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventInput {
  event_name: string;
  device_id?: string;
  user_id?: string;
  timestamp?: string;
  properties?: Record<string, unknown>;
}

export interface EventRow {
  event_id: string;
  event_name: string;
  timestamp: string;
  device_id: string | null;
  user_id: string | null;
  properties: string;
  ingested_at: string;
  resolved_id: string;
}

export interface QueryEventsOptions {
  event_name?: string;
  resolved_id?: string;
  /** ISO timestamp cursor — return events strictly before this time */
  before?: string;
  limit?: number;
}

// ─── Error ────────────────────────────────────────────────────────────────────

export class IdentityConflictError extends Error {
  readonly status = 409 as const;

  constructor(
    device_id: string,
    existing_user_id: string,
    new_user_id: string,
  ) {
    super(
      `Device "${device_id}" is already mapped to user "${existing_user_id}". Cannot remap to "${new_user_id}".`,
    );
    this.name = "IdentityConflictError";
    // Maintain correct prototype chain in transpiled environments
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Type alias for the ClickHouse client ─────────────────────────────────────

type ClickHouseClientLike = typeof clickhouse;

// ─── validateEvent ────────────────────────────────────────────────────────────

/**
 * Validates a raw event input object. Throws an Error if invalid.
 * After this call returns, callers may safely treat the input as EventInput.
 */
export function validateEvent(input: unknown): asserts input is EventInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("Event must be a non-null object.");
  }
  const evt = input as Record<string, unknown>;

  if (typeof evt.event_name !== "string" || evt.event_name.trim() === "") {
    throw new Error("event_name is required and must be a non-empty string.");
  }

  if (!evt.device_id && !evt.user_id) {
    throw new Error("At least one of device_id or user_id must be present.");
  }
}

// ─── resolveIdentityMapping ───────────────────────────────────────────────────

/**
 * Checks identity_mappings FINAL for an existing device → user mapping and:
 * - Inserts a new mapping if none exists.
 * - No-ops if the same mapping already exists (idempotent).
 * - Throws IdentityConflictError (status 409) if the device is mapped to a
 *   different user.
 */
export async function resolveIdentityMapping(
  device_id: string,
  user_id: string,
  client: ClickHouseClientLike = clickhouse,
): Promise<void> {
  const result = await client.query({
    query:
      "SELECT user_id FROM identity_mappings FINAL WHERE device_id = {device_id:String} LIMIT 1",
    query_params: { device_id },
    format: "JSONEachRow",
  });

  const rows = await result.json<{ user_id: string }>();

  if (rows.length === 0) {
    // No existing mapping — insert
    await client.insert({
      table: "identity_mappings",
      values: [{ device_id, user_id }],
      format: "JSONEachRow",
    });
    return;
  }

  const existingUserId = rows[0].user_id;

  if (existingUserId === user_id) {
    // Same mapping — no-op (idempotent)
    return;
  }

  // Different user — conflict
  throw new IdentityConflictError(device_id, existingUserId, user_id);
}

// ─── insertEvent ──────────────────────────────────────────────────────────────

/**
 * Validates, timestamps, and inserts a single event. If both device_id and
 * user_id are provided, also writes (or verifies) the identity mapping.
 *
 * Throws IdentityConflictError (status 409) if the device_id is already
 * associated with a different user_id.
 */
export async function insertEvent(
  input: unknown,
  client: ClickHouseClientLike = clickhouse,
): Promise<EventRow> {
  validateEvent(input);

  const timestamp = input.timestamp ?? new Date().toISOString();
  const properties = input.properties ? JSON.stringify(input.properties) : "{}";
  const event_id = crypto.randomUUID();
  const ingested_at = new Date().toISOString();

  await client.insert({
    table: "events",
    values: [
      {
        event_id,
        event_name: input.event_name,
        timestamp,
        device_id: input.device_id ?? null,
        user_id: input.user_id ?? null,
        properties,
      },
    ],
    format: "JSONEachRow",
  });

  if (input.device_id && input.user_id) {
    await resolveIdentityMapping(input.device_id, input.user_id, client);
  }

  const resolved_id = input.user_id ?? input.device_id ?? "";

  return {
    event_id,
    event_name: input.event_name,
    timestamp,
    device_id: input.device_id ?? null,
    user_id: input.user_id ?? null,
    properties,
    ingested_at,
    resolved_id,
  };
}

// ─── queryEventsWithResolvedId ────────────────────────────────────────────────

/**
 * Returns events joined with identity_mappings FINAL, with resolved_id
 * computed as coalesce(e.user_id, m.user_id, e.device_id).
 *
 * Optional filters: event_name, resolved_id, before (cursor), limit (max 200).
 */
export async function queryEventsWithResolvedId(
  options: QueryEventsOptions = {},
  client: ClickHouseClientLike = clickhouse,
): Promise<EventRow[]> {
  const { event_name, resolved_id, before, limit = 50 } = options;

  const conditions: string[] = [];
  const params: Record<string, string | number> = {
    limit: Math.min(limit, 200),
  };

  if (event_name) {
    conditions.push("e.event_name = {event_name:String}");
    params.event_name = event_name;
  }

  if (before) {
    conditions.push("e.timestamp < {before:String}");
    params.before = before;
  }

  if (resolved_id) {
    conditions.push(
      "coalesce(e.user_id, m.user_id, e.device_id) = {resolved_id:String}",
    );
    params.resolved_id = resolved_id;
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await client.query({
    query: `
      SELECT
        e.event_id,
        e.event_name,
        e.timestamp,
        e.device_id,
        e.user_id,
        e.properties,
        e.ingested_at,
        coalesce(e.user_id, m.user_id, e.device_id) AS resolved_id
      FROM events e
      LEFT JOIN (SELECT device_id, user_id FROM identity_mappings FINAL) m
        ON e.device_id = m.device_id
      ${where}
      ORDER BY e.timestamp DESC, e.event_id DESC
      LIMIT {limit:UInt64}
    `,
    query_params: params,
    format: "JSONEachRow",
  });

  return result.json<EventRow>();
}

// ─── getEventsByResolvedId ────────────────────────────────────────────────────

/**
 * Convenience wrapper: returns all events (up to 200) attributed to a given
 * resolved identity (user_id or device_id).
 */
export async function getEventsByResolvedId(
  resolved_id: string,
  client: ClickHouseClientLike = clickhouse,
): Promise<EventRow[]> {
  return queryEventsWithResolvedId({ resolved_id, limit: 200 }, client);
}
