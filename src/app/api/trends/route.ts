import { queryTrends } from "@/lib/trends";

// ─── Validation helpers ───────────────────────────────────────────────────────

const VALID_MEASURES = new Set(["count", "unique_users"]);
const VALID_GRANULARITIES = new Set(["day", "week"]);

/**
 * Returns an error string if the measure is invalid, otherwise null.
 * Valid forms: "count", "unique_users", "sum:<prop>", "avg:<prop>",
 * "min:<prop>", "max:<prop>" where <prop> is a non-empty string.
 */
function validateMeasure(measure: string): string | null {
  if (VALID_MEASURES.has(measure)) return null;
  const match = measure.match(/^(sum|avg|min|max):(.+)$/);
  if (match) return null;
  return `Invalid measure "${measure}". Must be count, unique_users, sum:<prop>, avg:<prop>, min:<prop>, or max:<prop>.`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * GET /api/trends
 *
 * Query params:
 *   event_name   (required)
 *   measure      default "count"
 *   granularity  default "day"
 *   start        (required) ISO date YYYY-MM-DD
 *   end          (required) ISO date YYYY-MM-DD
 *   breakdown    (optional) property name
 *   breakdown_limit (optional) default 10
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const event_name = searchParams.get("event_name");
  const measure = searchParams.get("measure") ?? "count";
  const granularity = searchParams.get("granularity") ?? "day";
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const breakdown = searchParams.get("breakdown") ?? undefined;
  const breakdownLimitRaw = searchParams.get("breakdown_limit");

  // ── Required param checks ─────────────────────────────────────────────────

  if (!event_name) {
    return Response.json({ error: "event_name is required." }, { status: 400 });
  }

  if (!start) {
    return Response.json({ error: "start is required." }, { status: 400 });
  }

  if (!end) {
    return Response.json({ error: "end is required." }, { status: 400 });
  }

  // ── Optional param validation ─────────────────────────────────────────────

  const measureError = validateMeasure(measure);
  if (measureError) {
    return Response.json({ error: measureError }, { status: 400 });
  }

  if (!VALID_GRANULARITIES.has(granularity)) {
    return Response.json(
      {
        error: `Invalid granularity "${granularity}". Must be "day" or "week".`,
      },
      { status: 400 },
    );
  }

  let breakdown_limit = 10;
  if (breakdownLimitRaw !== null) {
    const parsed = Number(breakdownLimitRaw);
    if (Number.isFinite(parsed) && parsed > 0) {
      breakdown_limit = Math.floor(parsed);
    }
  }

  // ── Execute query ─────────────────────────────────────────────────────────

  try {
    const response = await queryTrends({
      event_name,
      measure,
      granularity: granularity as "day" | "week",
      start,
      end,
      breakdown,
      breakdown_limit,
    });
    return Response.json(response);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
