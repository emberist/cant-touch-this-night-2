import { seedData } from "@/lib/seed";

export async function POST(): Promise<Response> {
  try {
    const result = await seedData();
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
