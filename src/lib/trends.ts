import { clickhouse } from "@/lib/clickhouse";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrendsParams {
  event_name: string;
  /** "count" | "unique_users" | "sum:<prop>" | "avg:<prop>" | "min:<prop>" | "max:<prop>" */
  measure: string;
  granularity: "day" | "week";
  /** ISO date string (YYYY-MM-DD) — inclusive lower bound */
  start: string;
  /** ISO date string (YYYY-MM-DD) — inclusive upper bound */
  end: string;
  breakdown?: string;
  breakdown_limit?: number;
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface Series {
  label: string;
  data: SeriesPoint[];
}

export interface TrendsResponse {
  series: Series[];
}

export interface TrendsQuerySpec {
  query: string;
  query_params: Record<string, string>;
}

// ─── Type alias for the ClickHouse client ────────────────────────────────────

type ClickHouseClientLike = typeof clickhouse;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Returns the exclusive upper bound timestamp for the given ISO date.
 *  Returns ClickHouse-compatible format: "YYYY-MM-DD HH:MM:SS.mmm" (no T/Z).
 */
function computeEndExclusive(end: string): string {
  const [y, m, d] = end.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day} 00:00:00.000`;
}

/** Builds the SQL aggregate expression for the given measure. */
function buildAggregateExpr(measure: string): string {
  if (measure === "count") return "count()";
  if (measure === "unique_users") {
    return "uniqExact(coalesce(e.user_id, m.user_id, e.device_id))";
  }
  const match = measure.match(/^(sum|avg|min|max):(.+)$/);
  if (match) {
    const fn = match[1];
    const prop = match[2];
    return `${fn}(JSONExtractFloat(e.properties, '${prop}'))`;
  }
  // Fallback — should be unreachable after route-level validation
  return "count()";
}

/** Builds the SQL date-bucket expression for the given granularity. */
function buildBucketExpr(granularity: "day" | "week"): string {
  return granularity === "week"
    ? "toMonday(e.timestamp)"
    : "toDate(e.timestamp)";
}

// ─── buildTrendsQuery ─────────────────────────────────────────────────────────

/**
 * Constructs the ClickHouse SQL query and bound parameters for a trends
 * request. Exported for unit testing of SQL correctness.
 */
export function buildTrendsQuery(params: TrendsParams): TrendsQuerySpec {
  const { event_name, measure, granularity, start, end, breakdown } = params;

  const aggregateExpr = buildAggregateExpr(measure);
  const bucketExpr = buildBucketExpr(granularity);
  const needsJoin = measure === "unique_users";

  const joinClause = needsJoin
    ? "LEFT JOIN (SELECT device_id, user_id FROM identity_mappings FINAL) m\n      ON e.device_id = m.device_id"
    : "";

  const query_params: Record<string, string> = {
    event_name,
    start: `${start} 00:00:00.000`,
    end_exclusive: computeEndExclusive(end),
  };

  if (breakdown) {
    const query = `
      SELECT
        ${bucketExpr} AS bucket,
        JSONExtractString(e.properties, '${breakdown}') AS breakdown_val,
        ${aggregateExpr} AS value
      FROM events e
      ${joinClause}
      WHERE e.event_name = {event_name:String}
        AND e.timestamp >= {start:String}
        AND e.timestamp < {end_exclusive:String}
      GROUP BY bucket, breakdown_val
      ORDER BY bucket ASC
    `.trim();
    return { query, query_params };
  }

  const query = `
    SELECT
      ${bucketExpr} AS bucket,
      ${aggregateExpr} AS value
    FROM events e
    ${joinClause}
    WHERE e.event_name = {event_name:String}
      AND e.timestamp >= {start:String}
      AND e.timestamp < {end_exclusive:String}
    GROUP BY bucket
    ORDER BY bucket ASC
  `.trim();

  return { query, query_params };
}

// ─── queryTrends ──────────────────────────────────────────────────────────────

interface TrendsRow {
  bucket: string;
  value: number | string;
  breakdown_val?: string;
}

/**
 * Executes the trends query and transforms the raw ClickHouse rows into the
 * series response shape.
 *
 * Without breakdown: returns a single series labelled with event_name.
 * With breakdown:    returns one series per top-N breakdown value, with the
 *                    remainder merged into an "Other" series.
 */
export async function queryTrends(
  params: TrendsParams,
  client: ClickHouseClientLike = clickhouse,
): Promise<TrendsResponse> {
  const { event_name, breakdown, breakdown_limit = 10 } = params;
  const { query, query_params } = buildTrendsQuery(params);

  const result = await client.query({
    query,
    query_params,
    format: "JSONEachRow",
  });

  const rows = await result.json<TrendsRow>();

  if (rows.length === 0) {
    return { series: [] };
  }

  // ── No breakdown: single series ─────────────────────────────────────────────

  if (!breakdown) {
    const data: SeriesPoint[] = rows.map((r) => ({
      date: r.bucket,
      value: Number(r.value),
    }));
    return { series: [{ label: event_name, data }] };
  }

  // ── With breakdown: group rows by breakdown_val ───────────────────────────

  const seriesMap = new Map<string, SeriesPoint[]>();
  const totalsByLabel = new Map<string, number>();

  for (const row of rows) {
    const label = row.breakdown_val ?? "";
    const value = Number(row.value);

    let points = seriesMap.get(label);
    if (points === undefined) {
      points = [];
      seriesMap.set(label, points);
      totalsByLabel.set(label, 0);
    }
    points.push({ date: row.bucket, value });
    totalsByLabel.set(label, (totalsByLabel.get(label) ?? 0) + value);
  }

  // Sort by total descending to determine top-N
  const sorted = Array.from(totalsByLabel.entries()).sort(
    ([, a], [, b]) => b - a,
  );

  const series: Series[] = [];

  // Add top-N individual series
  for (const [label] of sorted.slice(0, breakdown_limit)) {
    series.push({ label, data: seriesMap.get(label) ?? [] });
  }

  // Merge remaining values into "Other"
  const restEntries = sorted.slice(breakdown_limit);
  if (restEntries.length > 0) {
    const otherMap = new Map<string, number>();
    for (const [otherLabel] of restEntries) {
      for (const point of seriesMap.get(otherLabel) ?? []) {
        otherMap.set(point.date, (otherMap.get(point.date) ?? 0) + point.value);
      }
    }
    const otherData = Array.from(otherMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
    series.push({ label: "Other", data: otherData });
  }

  return { series };
}
