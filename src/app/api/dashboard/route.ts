import { clickhouse } from "@/lib/clickhouse";

export async function GET(): Promise<Response> {
  try {
    const [eventsResult, usersResult, topEventResult] = await Promise.all([
      clickhouse.query({
        query: "SELECT count() AS cnt FROM events",
        format: "JSONEachRow",
      }),
      clickhouse.query({
        query: `
          SELECT count(DISTINCT coalesce(e.user_id, m.user_id, e.device_id)) AS cnt
          FROM events e
          LEFT JOIN (SELECT device_id, user_id FROM identity_mappings FINAL) m
            ON e.device_id = m.device_id
        `,
        format: "JSONEachRow",
      }),
      clickhouse.query({
        query: `
          SELECT event_name, count() AS cnt
          FROM events
          WHERE timestamp >= now() - INTERVAL 7 DAY
          GROUP BY event_name
          ORDER BY cnt DESC
          LIMIT 1
        `,
        format: "JSONEachRow",
      }),
    ]);

    const [eventsRow] = await eventsResult.json<{ cnt: string }>();
    const [usersRow] = await usersResult.json<{ cnt: string }>();
    const topEventRows = await topEventResult.json<{
      event_name: string;
      cnt: string;
    }>();
    const topRow = topEventRows[0] ?? null;

    return Response.json({
      total_events: Number(eventsRow?.cnt ?? 0),
      total_users: Number(usersRow?.cnt ?? 0),
      top_event_7d: topRow
        ? { name: topRow.event_name, count: Number(topRow.cnt) }
        : null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
