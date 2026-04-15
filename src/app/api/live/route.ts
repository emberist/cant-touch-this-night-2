import { queryNewEvents } from "@/lib/live";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a JS Date to the ClickHouse-compatible datetime string format:
 * "YYYY-MM-DD HH:MM:SS.mmm" (no T, no Z).
 */
function toClickHouseDateTime(d: Date): string {
  return d.toISOString().replace("T", " ").replace("Z", "");
}

// ─── GET /api/live ────────────────────────────────────────────────────────────

export async function GET(): Promise<Response> {
  // Watermark: only events ingested after this point will be streamed.
  // Initialized to the current server time so the feed shows only new events.
  let lastSeenIngestedAt = toClickHouseDateTime(new Date());

  let intervalId: ReturnType<typeof setInterval> | undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Immediately enqueue a keep-alive comment so that the HTTP status line
      // and headers are flushed to the client on connect, even when no events
      // exist yet.  SSE clients treat lines beginning with ":" as comments and
      // ignore them.
      controller.enqueue(encoder.encode(":\n\n"));

      intervalId = setInterval(async () => {
        try {
          const events = await queryNewEvents(lastSeenIngestedAt);

          for (const event of events) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
            );
          }

          // Advance watermark to the latest ingested_at in this batch
          if (events.length > 0) {
            lastSeenIngestedAt = events[events.length - 1].ingested_at;
          }
        } catch {
          // Swallow errors — keep the stream alive on transient ClickHouse issues
        }
      }, 1000);
    },
    cancel() {
      clearInterval(intervalId);
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
