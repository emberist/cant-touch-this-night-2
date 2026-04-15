import { queryEventsWithResolvedId } from "@/lib/identity";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const params = url.searchParams;

  const event_name = params.get("event_name") ?? undefined;
  const resolved_id = params.get("resolved_id") ?? undefined;
  const before = params.get("before") ?? undefined;
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

  const events = await queryEventsWithResolvedId({
    event_name,
    resolved_id,
    before,
    limit,
  });

  const next_cursor =
    events.length === limit ? events[events.length - 1].timestamp : null;

  return Response.json({ events, next_cursor });
}
