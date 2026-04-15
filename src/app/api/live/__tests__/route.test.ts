import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const { mockQueryNewEvents } = vi.hoisted(() => ({
  mockQueryNewEvents: vi.fn(),
}));

vi.mock("@/lib/live", () => ({
  queryNewEvents: mockQueryNewEvents,
}));

import { GET } from "@/app/api/live/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sampleEvent = {
  event_id: "evt-1",
  event_name: "Page Viewed",
  timestamp: "2026-04-15 12:00:00.000",
  device_id: "device-abc",
  user_id: null,
  properties: "{}",
  ingested_at: "2026-04-15 12:00:01.000",
  resolved_id: "device-abc",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQueryNewEvents.mockResolvedValue([]);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("GET /api/live", () => {
  it("returns status 200", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    res.body?.cancel();
  });

  it("returns Content-Type: text/event-stream", async () => {
    const res = await GET();
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    res.body?.cancel();
  });

  it("returns Cache-Control: no-cache", async () => {
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
    res.body?.cancel();
  });

  it("returns a non-null body stream", async () => {
    const res = await GET();
    expect(res.body).not.toBeNull();
    res.body?.cancel();
  });

  it("immediately enqueues a keep-alive SSE comment on connect before any timer fires", async () => {
    const res = await GET();
    expect(res.body).not.toBeNull();
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();

    // No timer advancement — the keep-alive comment should already be queued
    const { value } = await reader.read();
    expect(decoder.decode(value)).toBe(":\n\n");

    reader.cancel();
  });

  it("emits data: <JSON>\\n\\n for each event returned by queryNewEvents", async () => {
    mockQueryNewEvents
      .mockResolvedValueOnce([sampleEvent])
      .mockResolvedValue([]);

    const res = await GET();
    expect(res.body).not.toBeNull();
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();

    // Consume the initial keep-alive comment that is sent on connect
    const { value: keepAliveValue } = await reader.read();
    expect(decoder.decode(keepAliveValue)).toBe(":\n\n");

    // Advance clock 1 second to trigger the first polling tick
    await vi.advanceTimersByTimeAsync(1000);

    const { value } = await reader.read();
    const text = decoder.decode(value);

    expect(text).toContain(`data: ${JSON.stringify(sampleEvent)}\n\n`);

    reader.cancel();
  });

  it("does not emit data: lines when queryNewEvents returns an empty array", async () => {
    mockQueryNewEvents.mockResolvedValue([]);

    const res = await GET();
    expect(res.body).not.toBeNull();
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();

    // Consume the initial keep-alive comment that is sent on connect
    const { value: keepAliveValue } = await reader.read();
    expect(decoder.decode(keepAliveValue)).toBe(":\n\n");

    // Advance clock to trigger the polling tick
    await vi.advanceTimersByTimeAsync(1000);

    // Confirm the tick ran
    expect(mockQueryNewEvents).toHaveBeenCalledOnce();

    // Start a read — it should stay pending since no data events were enqueued
    let didResolve = false;
    const readPromise = reader.read().then(() => {
      didResolve = true;
    });

    // Flush microtasks — any immediately-enqueued data would resolve here
    await Promise.resolve();
    await Promise.resolve();

    expect(didResolve).toBe(false);

    // Cleanup: cancel the stream (this will eventually resolve the pending read)
    reader.cancel();
    await readPromise.catch(() => {});
  });
});
