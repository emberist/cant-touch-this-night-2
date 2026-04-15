import { clickhouse } from "@/lib/clickhouse";
import type { EventRow } from "@/lib/identity";

// ─── Type alias for the ClickHouse client ────────────────────────────────────

type ClickHouseClientLike = typeof clickhouse;

// ─── queryNewEvents ───────────────────────────────────────────────────────────

/**
 * Returns events ingested after sinceIngestedAt, joined with identity_mappings
 * FINAL so that resolved_id is computed via coalesce(e.user_id, m.user_id,
 * e.device_id). Events are ordered oldest-first (ingested_at ASC) and capped
 * at 200 rows per call.
 *
 * sinceIngestedAt must be a ClickHouse-compatible datetime string
 * ("YYYY-MM-DD HH:MM:SS.mmm").
 */
export async function queryNewEvents(
  sinceIngestedAt: string,
  client: ClickHouseClientLike = clickhouse,
): Promise<EventRow[]> {
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
      WHERE e.ingested_at > {since:String}
      ORDER BY e.ingested_at ASC, e.event_id ASC
      LIMIT 200
    `,
    query_params: { since: sinceIngestedAt },
    format: "JSONEachRow",
  });

  return result.json<EventRow>();
}
