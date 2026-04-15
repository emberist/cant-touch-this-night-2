import { clickhouse } from "@/lib/clickhouse";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FunnelParams {
  steps: string[];
  /** ISO date string (YYYY-MM-DD) — inclusive lower bound */
  start: string;
  /** ISO date string (YYYY-MM-DD) — inclusive upper bound */
  end: string;
}

export interface FunnelStepResult {
  name: string;
  users: number;
  conversion_from_prev: number | null;
  conversion_overall: number;
}

export interface FunnelResponse {
  steps: FunnelStepResult[];
}

export interface FunnelQuerySpec {
  query: string;
  query_params: Record<string, string>;
}

// ─── Type alias for the ClickHouse client ─────────────────────────────────────

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

// ─── buildFunnelQuery ─────────────────────────────────────────────────────────

/**
 * Constructs the ClickHouse SQL query and bound parameters for a funnel request.
 * Uses windowFunnel() aggregate to find the max funnel level reached per user,
 * then groups by level to count users at each depth.
 *
 * Exported for unit testing of SQL correctness.
 */
export function buildFunnelQuery(params: FunnelParams): FunnelQuerySpec {
  const { steps, start, end } = params;

  const query_params: Record<string, string> = {
    start: `${start} 00:00:00.000`,
    end_exclusive: computeEndExclusive(end),
  };

  for (let i = 0; i < steps.length; i++) {
    query_params[`step_${i}`] = steps[i];
  }

  // Build the step conditions: e.event_name = {step_0:String}, etc.
  const stepConditions = steps
    .map((_, i) => `e.event_name = {step_${i}:String}`)
    .join(",\n      ");

  const query = `
    SELECT level, count() AS cnt
    FROM (
      SELECT
        coalesce(e.user_id, m.user_id, e.device_id) AS resolved_id,
        windowFunnel(2147483647)(
          toUnixTimestamp(e.timestamp),
          ${stepConditions}
        ) AS level
      FROM events e
      LEFT JOIN (SELECT device_id, user_id FROM identity_mappings FINAL) m
        ON e.device_id = m.device_id
      WHERE e.timestamp >= {start:String}
        AND e.timestamp < {end_exclusive:String}
      GROUP BY resolved_id
    )
    GROUP BY level
    ORDER BY level ASC
  `.trim();

  return { query, query_params };
}

// ─── queryFunnel ──────────────────────────────────────────────────────────────

interface FunnelLevelRow {
  level: number | string;
  cnt: number | string;
}

/**
 * Executes the funnel query and transforms raw level counts into per-step
 * user counts with conversion_from_prev and conversion_overall rates.
 *
 * windowFunnel returns the max level each user reached (0 = no step completed,
 * 1 = step 1 completed, etc.). Users at step N = sum of cnt for levels >= N.
 */
export async function queryFunnel(
  params: FunnelParams,
  client: ClickHouseClientLike = clickhouse,
): Promise<FunnelResponse> {
  const { steps } = params;
  const { query, query_params } = buildFunnelQuery(params);

  const result = await client.query({
    query,
    query_params,
    format: "JSONEachRow",
  });

  const rows = await result.json<FunnelLevelRow>();

  if (rows.length === 0) {
    return { steps: [] };
  }

  // Build a map of level → user count (coerce strings to numbers)
  const levelCounts = new Map<number, number>();
  for (const row of rows) {
    const level = Number(row.level);
    const cnt = Number(row.cnt);
    levelCounts.set(level, (levelCounts.get(level) ?? 0) + cnt);
  }

  // Compute cumulative user counts: users at step i = sum of cnt for levels >= (i+1)
  // A user who reached level L is counted in steps 1..L (indices 0..L-1)
  const userCounts = new Array<number>(steps.length).fill(0);
  for (const [level, cnt] of levelCounts) {
    for (let i = 0; i < Math.min(level, steps.length); i++) {
      userCounts[i] += cnt;
    }
  }

  const step1Users = userCounts[0];

  const result_steps: FunnelStepResult[] = steps.map((name, i) => {
    const users = userCounts[i];
    const prevUsers = i === 0 ? null : userCounts[i - 1];

    const conversion_from_prev: number | null =
      i === 0 ? null : prevUsers === 0 ? 0 : users / (prevUsers as number);

    const conversion_overall: number =
      i === 0 ? 1.0 : step1Users === 0 ? 0 : users / step1Users;

    return { name, users, conversion_from_prev, conversion_overall };
  });

  return { steps: result_steps };
}
