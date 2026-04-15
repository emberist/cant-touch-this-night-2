import { type JobConfigInput, startGenerationJob } from "@/lib/generator";

export async function POST(request: Request): Promise<Response> {
  let body: JobConfigInput;
  try {
    body = (await request.json()) as JobConfigInput;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let job_id: string;
  try {
    job_id = startGenerationJob(body);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid generation config.";
    return Response.json({ error: message }, { status: 400 });
  }

  return Response.json({ job_id }, { status: 201 });
}
