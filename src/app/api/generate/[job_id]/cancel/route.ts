import { cancelJob } from "@/lib/generator";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ job_id: string }> },
): Promise<Response> {
  const { job_id } = await params;

  const found = cancelJob(job_id);
  if (!found) {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }

  return Response.json({ cancelled: true });
}
