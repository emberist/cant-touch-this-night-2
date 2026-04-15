import { IdentityConflictError, insertEvent } from "@/lib/identity";

interface BatchError {
  index: number;
  error: string;
}

interface BatchResult {
  ok: number;
  errors: BatchError[];
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return Response.json(
      { error: "Request body must be an array of events." },
      { status: 400 },
    );
  }

  const result: BatchResult = { ok: 0, errors: [] };

  for (let i = 0; i < body.length; i++) {
    try {
      await insertEvent(body[i]);
      result.ok++;
    } catch (error) {
      if (error instanceof IdentityConflictError || error instanceof Error) {
        result.errors.push({ index: i, error: (error as Error).message });
      } else {
        result.errors.push({ index: i, error: "Unexpected error." });
      }
    }
  }

  return Response.json(result, { status: 200 });
}
