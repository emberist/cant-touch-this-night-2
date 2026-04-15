import { getUserProfile } from "@/lib/users";

type UserIdContext = { params: Promise<{ id: string }> };

/**
 * GET /api/users/[id]
 *
 * Returns the full user profile for the given resolved identity, including
 * first_seen, last_seen, identity_cluster, and recent events.
 *
 * Returns 404 if no events are found for the given id.
 */
export async function GET(
  _request: Request,
  ctx: UserIdContext,
): Promise<Response> {
  const { id } = await ctx.params;

  try {
    const profile = await getUserProfile(id);

    if (profile === null) {
      return Response.json(
        { error: `User "${id}" not found.` },
        { status: 404 },
      );
    }

    return Response.json(profile);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
