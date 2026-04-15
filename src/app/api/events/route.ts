import { IdentityConflictError, insertEvent } from "@/lib/identity";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const row = await insertEvent(body);
    return Response.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof IdentityConflictError) {
      return Response.json(
        { error: (error as Error).message },
        { status: 409 },
      );
    }
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Unexpected error." }, { status: 500 });
  }
}
