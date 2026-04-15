import { clickhouse } from "@/lib/clickhouse";
import type { EventRow } from "@/lib/identity";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserListItem {
  resolved_id: string;
  first_seen: string;
  last_seen: string;
  event_count: number;
}

export interface IdentityCluster {
  user_ids: string[];
  device_ids: string[];
}

export interface UserProfile {
  resolved_id: string;
  first_seen: string;
  last_seen: string;
  identity_cluster: IdentityCluster;
  events: EventRow[];
}

export interface UserSearchOptions {
  q?: string;
  limit?: number;
  cursor?: string;
}

export interface UserSearchResult {
  users: UserListItem[];
  next_cursor: string | null;
}

// ─── Type alias for the ClickHouse client ─────────────────────────────────────

type ClickHouseClientLike = typeof clickhouse;

// ─── searchUsers ──────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of distinct resolved identities from the events
 * table, joined with identity_mappings FINAL.
 *
 * Cursor is the last resolved_id from the previous page (lexicographic order).
 * q is applied as a substring ILIKE filter on resolved_id.
 */
export async function searchUsers(
  options: UserSearchOptions = {},
  client: ClickHouseClientLike = clickhouse,
): Promise<UserSearchResult> {
  const { q, cursor } = options;
  const limit = Math.min(options.limit ?? 50, 200);

  const conditions: string[] = [];
  const params: Record<string, string | number> = { limit };

  if (q) {
    conditions.push("resolved_id ILIKE {q:String}");
    params.q = `%${q}%`;
  }

  if (cursor) {
    conditions.push("resolved_id > {cursor:String}");
    params.cursor = cursor;
  }

  const having =
    conditions.length > 0 ? `HAVING ${conditions.join(" AND ")}` : "";

  const result = await client.query({
    query: `
      SELECT
        coalesce(e.user_id, m.user_id, e.device_id) AS resolved_id,
        min(e.timestamp) AS first_seen,
        max(e.timestamp) AS last_seen,
        count() AS event_count
      FROM events e
      LEFT JOIN (SELECT device_id, user_id FROM identity_mappings FINAL) m
        ON e.device_id = m.device_id
      GROUP BY resolved_id
      ${having}
      ORDER BY resolved_id ASC
      LIMIT {limit:UInt64}
    `,
    query_params: params,
    format: "JSONEachRow",
  });

  const rows = await result.json<
    Omit<UserListItem, "event_count"> & { event_count: number | string }
  >();

  const users: UserListItem[] = rows.map((row) => ({
    resolved_id: row.resolved_id,
    first_seen: row.first_seen,
    last_seen: row.last_seen,
    event_count: Number(row.event_count),
  }));

  const next_cursor =
    users.length === limit ? users[users.length - 1].resolved_id : null;

  return { users, next_cursor };
}

// ─── getUserProfile ────────────────────────────────────────────────────────────

/**
 * Returns a full user profile for a given resolved_id, including:
 * - first_seen / last_seen timestamps
 * - identity_cluster: all user_ids and device_ids associated with this identity
 * - recent events (up to 200, newest first)
 *
 * Returns null if no events are found for the given resolved_id.
 */
export async function getUserProfile(
  resolved_id: string,
  client: ClickHouseClientLike = clickhouse,
): Promise<UserProfile | null> {
  // ── Query 1: stats ──────────────────────────────────────────────────────────

  const statsResult = await client.query({
    query: `
      SELECT
        count() AS event_count,
        min(e.timestamp) AS first_seen,
        max(e.timestamp) AS last_seen
      FROM events e
      LEFT JOIN (SELECT device_id, user_id FROM identity_mappings FINAL) m
        ON e.device_id = m.device_id
      WHERE coalesce(e.user_id, m.user_id, e.device_id) = {resolved_id:String}
    `,
    query_params: { resolved_id },
    format: "JSONEachRow",
  });

  const statsRows = await statsResult.json<{
    event_count: number | string;
    first_seen: string;
    last_seen: string;
  }>();

  if (statsRows.length === 0 || Number(statsRows[0].event_count) === 0) {
    return null;
  }

  const { first_seen, last_seen } = statsRows[0];

  // ── Query 2: identity cluster ───────────────────────────────────────────────

  const clusterResult = await client.query({
    query: `
      SELECT DISTINCT
        e.user_id,
        e.device_id
      FROM events e
      LEFT JOIN (SELECT device_id, user_id FROM identity_mappings FINAL) m
        ON e.device_id = m.device_id
      WHERE coalesce(e.user_id, m.user_id, e.device_id) = {resolved_id:String}
    `,
    query_params: { resolved_id },
    format: "JSONEachRow",
  });

  const clusterRows = await clusterResult.json<{
    user_id: string | null;
    device_id: string | null;
  }>();

  const user_ids = [
    ...new Set(
      clusterRows
        .map((r) => r.user_id)
        .filter((id): id is string => id !== null),
    ),
  ];
  const device_ids = [
    ...new Set(
      clusterRows
        .map((r) => r.device_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  // ── Query 3: events ─────────────────────────────────────────────────────────

  const eventsResult = await client.query({
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
      WHERE coalesce(e.user_id, m.user_id, e.device_id) = {resolved_id:String}
      ORDER BY e.timestamp DESC, e.event_id DESC
      LIMIT 200
    `,
    query_params: { resolved_id },
    format: "JSONEachRow",
  });

  const events = await eventsResult.json<EventRow>();

  return {
    resolved_id,
    first_seen: first_seen as string,
    last_seen: last_seen as string,
    identity_cluster: { user_ids, device_ids },
    events,
  };
}
