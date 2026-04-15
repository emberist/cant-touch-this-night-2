import { queryFunnel } from "@/lib/funnels";

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/funnels
 *
 * Body:
 *   steps  (required) — array of 2–5 event name strings
 *   start  (required) — ISO date YYYY-MM-DD, inclusive lower bound
 *   end    (required) — ISO date YYYY-MM-DD, inclusive upper bound
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json(
      { error: "Request body must be a JSON object." },
      { status: 400 },
    );
  }

  const raw = body as Record<string, unknown>;

  // ── Validate steps ────────────────────────────────────────────────────────

  if (!Array.isArray(raw.steps)) {
    return Response.json(
      { error: "steps is required and must be an array." },
      { status: 400 },
    );
  }

  if (raw.steps.length < 2) {
    return Response.json(
      { error: "steps must contain at least 2 entries." },
      { status: 400 },
    );
  }

  if (raw.steps.length > 5) {
    return Response.json(
      { error: "steps must contain at most 5 entries." },
      { status: 400 },
    );
  }

  for (const step of raw.steps) {
    if (typeof step !== "string" || step.trim() === "") {
      return Response.json(
        { error: "Each step must be a non-empty string." },
        { status: 400 },
      );
    }
  }

  const steps = raw.steps as string[];

  // ── Validate start / end ──────────────────────────────────────────────────

  if (typeof raw.start !== "string" || raw.start.trim() === "") {
    return Response.json({ error: "start is required." }, { status: 400 });
  }

  if (typeof raw.end !== "string" || raw.end.trim() === "") {
    return Response.json({ error: "end is required." }, { status: 400 });
  }

  // ── Execute query ─────────────────────────────────────────────────────────

  try {
    const response = await queryFunnel({
      steps,
      start: raw.start,
      end: raw.end,
    });
    return Response.json(response);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
