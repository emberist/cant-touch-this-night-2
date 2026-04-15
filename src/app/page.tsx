import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { clickhouse } from "@/lib/clickhouse";

async function getMetrics(): Promise<{
  total_events: number;
  total_users: number;
  top_event_7d: { name: string; count: number } | null;
}> {
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

  return {
    total_events: Number(eventsRow?.cnt ?? 0),
    total_users: Number(usersRow?.cnt ?? 0),
    top_event_7d: topRow
      ? { name: topRow.event_name, count: Number(topRow.cnt) }
      : null,
  };
}

export default async function Dashboard(): Promise<React.JSX.Element> {
  let metrics = { total_events: 0, total_users: 0, top_event_7d: null } as {
    total_events: number;
    total_users: number;
    top_event_7d: { name: string; count: number } | null;
  };

  try {
    metrics = await getMetrics();
  } catch {
    // ClickHouse may not be running in CI/build; show zeros
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 3,
          mt: 2,
        }}
      >
        <Card data-testid="metric-total-events">
          <CardContent>
            <Typography variant="h3" component="p" sx={{ fontWeight: "bold" }}>
              {metrics.total_events.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Events
            </Typography>
          </CardContent>
        </Card>

        <Card data-testid="metric-total-users">
          <CardContent>
            <Typography variant="h3" component="p" sx={{ fontWeight: "bold" }}>
              {metrics.total_users.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Users
            </Typography>
          </CardContent>
        </Card>

        <Card data-testid="metric-top-event">
          <CardContent>
            <Typography variant="h5" component="p" sx={{ fontWeight: "bold" }}>
              {metrics.top_event_7d
                ? metrics.top_event_7d.name
                : "No events yet"}
            </Typography>
            {metrics.top_event_7d && (
              <Typography variant="body2" color="text.secondary">
                {metrics.top_event_7d.count.toLocaleString()} times
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Top Event (last 7 days)
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
