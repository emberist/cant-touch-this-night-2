import { getJob } from "@/lib/generator";

const TERMINAL_STATUSES = new Set(["complete", "failed", "cancelled"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ job_id: string }> },
): Promise<Response> {
  const { job_id } = await params;

  const job = getJob(job_id);
  if (!job) {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Flush headers immediately with a keep-alive comment
      controller.enqueue(encoder.encode(":\n\n"));

      const intervalId = setInterval(() => {
        const current = getJob(job_id);
        if (!current) {
          clearInterval(intervalId);
          controller.close();
          return;
        }

        const payload =
          current.status === "complete"
            ? {
                status: current.status,
                inserted: current.inserted,
                total: current.total,
                elapsed_ms: current.elapsed_ms,
              }
            : {
                status: current.status,
                inserted: current.inserted,
                total: current.total,
                throughput: current.throughput,
                eta_seconds: current.eta_seconds,
              };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );

        if (TERMINAL_STATUSES.has(current.status)) {
          clearInterval(intervalId);
          controller.close();
        }
      }, 500);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
