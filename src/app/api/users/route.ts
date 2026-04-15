import { searchUsers } from "@/lib/users";

/**
 * GET /api/users
 *
 * Query params:
 *   q      (optional) — substring search on resolved_id
 *   limit  (optional, default 50, max 200) — page size
 *   cursor (optional) — last resolved_id from previous page (lexicographic)
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const params = url.searchParams;

  const q = params.get("q") ?? undefined;
  const cursor = params.get("cursor") ?? undefined;
  const limitRaw = params.get("limit");

  let limit = 50;

  if (limitRaw !== null) {
    const parsed = Number(limitRaw);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return Response.json(
        { error: "limit must be a positive integer." },
        { status: 400 },
      );
    }
    limit = Math.min(Math.floor(parsed), 200);
  }

  try {
    const result = await searchUsers({ q, limit, cursor });
    return Response.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
