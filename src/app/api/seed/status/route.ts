import { clickhouse } from "@/lib/clickhouse";

export async function GET(): Promise<Response> {
  try {
    const [eventsResult, usersResult] = await Promise.all([
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
    ]);

    const [eventsRow] = await eventsResult.json<{ cnt: string }>();
    const [usersRow] = await usersResult.json<{ cnt: string }>();

    return Response.json({
      events: Number(eventsRow?.cnt ?? 0),
      users: Number(usersRow?.cnt ?? 0),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
