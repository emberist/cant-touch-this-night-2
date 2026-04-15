// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGenerator } from "@/components/generate/useGenerator";

// ─── Mock EventSource ─────────────────────────────────────────────────────────

interface MockESInstance {
  url: string;
  onmessage: ((e: { data: string }) => void) | null;
  onerror: ((e: Event) => void) | null;
  onopen: ((e: Event) => void) | null;
  close: ReturnType<typeof vi.fn>;
  simulateMessage: (data: string) => void;
}

const mockEventSourceInstances: MockESInstance[] = [];

class MockEventSource {
  url: string;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onopen: ((e: Event) => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockEventSourceInstances.push(this as any);
  }

  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }
}

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

function makeOkResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

function makeErrorResponse(
  status = 500,
  body: unknown = { error: "server error" },
) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  });
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.stubGlobal("EventSource", MockEventSource);
  mockEventSourceInstances.length = 0;
  // Default: fetchJobs returns empty array on mount
  mockFetch.mockImplementation((url: string) => {
    if ((url as string).includes("/api/generate/jobs"))
      return makeOkResponse([]);
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  mockEventSourceInstances.length = 0;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useGenerator", () => {
  // ── Initial form state ────────────────────────────────────────────────────

  describe("initial form state", () => {
    it("total defaults to 10000", () => {
      const { result } = renderHook(() => useGenerator());
      expect(result.current.form.total).toBe(10000);
    });

    it("users defaults to 100", () => {
      const { result } = renderHook(() => useGenerator());
      expect(result.current.form.users).toBe(100);
    });

    it("identity_resolution defaults to true", () => {
      const { result } = renderHook(() => useGenerator());
      expect(result.current.form.identity_resolution).toBe(true);
    });

    it("anonymous_ratio defaults to 30", () => {
      const { result } = renderHook(() => useGenerator());
      expect(result.current.form.anonymous_ratio).toBe(30);
    });

    it("numeric_variance defaults to 'medium'", () => {
      const { result } = renderHook(() => useGenerator());
      expect(result.current.form.numeric_variance).toBe("medium");
    });

    it("start defaults to approximately 30 days ago (YYYY-MM-DD)", () => {
      const { result } = renderHook(() => useGenerator());
      expect(result.current.form.start).toBe(daysAgoISO(30));
    });

    it("end defaults to today (YYYY-MM-DD)", () => {
      const { result } = renderHook(() => useGenerator());
      expect(result.current.form.end).toBe(todayISO());
    });

    it("event_types defaults to 6 entries", () => {
      const { result } = renderHook(() => useGenerator());
      expect(result.current.form.event_types).toHaveLength(6);
    });

    it("event_types includes 'Page Viewed' with weight 0.4", () => {
      const { result } = renderHook(() => useGenerator());
      const pv = result.current.form.event_types.find(
        (et) => et.name === "Page Viewed",
      );
      expect(pv).toBeDefined();
      expect(pv?.weight).toBe(0.4);
    });

    it("event_types includes 'Purchase Completed' with weight 0.13", () => {
      const { result } = renderHook(() => useGenerator());
      const pc = result.current.form.event_types.find(
        (et) => et.name === "Purchase Completed",
      );
      expect(pc).toBeDefined();
      expect(pc?.weight).toBe(0.13);
    });

    it("jobActive is false initially", () => {
      const { result } = renderHook(() => useGenerator());
      expect(result.current.jobActive).toBe(false);
    });

    it("progress is null initially", () => {
      const { result } = renderHook(() => useGenerator());
      expect(result.current.progress).toBeNull();
    });

    it("error is null initially", () => {
      const { result } = renderHook(() => useGenerator());
      expect(result.current.error).toBeNull();
    });
  });

  // ── applyPreset ───────────────────────────────────────────────────────────

  describe("applyPreset", () => {
    it("'realistic' sets total=10000, users=100", () => {
      const { result } = renderHook(() => useGenerator());
      act(() => result.current.applyPreset("realistic"));
      expect(result.current.form.total).toBe(10000);
      expect(result.current.form.users).toBe(100);
    });

    it("'realistic' sets date range to last 30 days", () => {
      const { result } = renderHook(() => useGenerator());
      act(() => result.current.applyPreset("realistic"));
      expect(result.current.form.start).toBe(daysAgoISO(30));
      expect(result.current.form.end).toBe(todayISO());
    });

    it("'high-volume' sets total=100000", () => {
      const { result } = renderHook(() => useGenerator());
      act(() => result.current.applyPreset("high-volume"));
      expect(result.current.form.total).toBe(100000);
    });

    it("'high-volume' sets date range to last 90 days", () => {
      const { result } = renderHook(() => useGenerator());
      act(() => result.current.applyPreset("high-volume"));
      expect(result.current.form.start).toBe(daysAgoISO(90));
      expect(result.current.form.end).toBe(todayISO());
    });

    it("'stress-test' sets total=1000000", () => {
      const { result } = renderHook(() => useGenerator());
      act(() => result.current.applyPreset("stress-test"));
      expect(result.current.form.total).toBe(1000000);
    });

    it("'stress-test' sets date range to last 365 days", () => {
      const { result } = renderHook(() => useGenerator());
      act(() => result.current.applyPreset("stress-test"));
      expect(result.current.form.start).toBe(daysAgoISO(365));
      expect(result.current.form.end).toBe(todayISO());
    });
  });

  // ── startJob ──────────────────────────────────────────────────────────────

  describe("startJob", () => {
    it("calls POST /api/generate/start with correct body", async () => {
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/generate/jobs"))
          return makeOkResponse([]);
        if ((url as string).includes("/api/generate/start"))
          return makeOkResponse({ job_id: "test-job-123" });
        return Promise.reject(new Error(`Unexpected: ${url}`));
      });

      const { result } = renderHook(() => useGenerator());

      await act(async () => {
        await result.current.startJob();
      });

      const startCall = (mockFetch.mock.calls as [string, RequestInit][]).find(
        ([url]) => url.includes("/api/generate/start"),
      );
      expect(startCall).toBeDefined();
      expect(startCall![1].method).toBe("POST");
      const body = JSON.parse(startCall![1].body as string) as Record<
        string,
        unknown
      >;
      expect(body.total).toBe(10000);
      expect(body.users).toBe(100);
    });

    it("sets jobActive to true after successful start", async () => {
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/generate/jobs"))
          return makeOkResponse([]);
        if ((url as string).includes("/api/generate/start"))
          return makeOkResponse({ job_id: "test-job-123" });
        return Promise.reject(new Error(`Unexpected: ${url}`));
      });

      const { result } = renderHook(() => useGenerator());

      await act(async () => {
        await result.current.startJob();
      });

      expect(result.current.jobActive).toBe(true);
    });

    it("opens SSE connection to /api/generate/[job_id]/status", async () => {
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/generate/jobs"))
          return makeOkResponse([]);
        if ((url as string).includes("/api/generate/start"))
          return makeOkResponse({ job_id: "test-job-123" });
        return Promise.reject(new Error(`Unexpected: ${url}`));
      });

      const { result } = renderHook(() => useGenerator());

      await act(async () => {
        await result.current.startJob();
      });

      expect(mockEventSourceInstances).toHaveLength(1);
      expect(mockEventSourceInstances[0].url).toBe(
        "/api/generate/test-job-123/status",
      );
    });

    it("sets error state when POST fails", async () => {
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/generate/jobs"))
          return makeOkResponse([]);
        if ((url as string).includes("/api/generate/start"))
          return makeErrorResponse(500, { error: "Internal Server Error" });
        return Promise.reject(new Error(`Unexpected: ${url}`));
      });

      const { result } = renderHook(() => useGenerator());

      await act(async () => {
        await result.current.startJob();
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.jobActive).toBe(false);
    });
  });

  // ── SSE progress ──────────────────────────────────────────────────────────

  describe("SSE progress messages", () => {
    async function startJobAndGetES(
      result: ReturnType<
        typeof renderHook<ReturnType<typeof useGenerator>, unknown>
      >["result"],
    ) {
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/generate/jobs"))
          return makeOkResponse([]);
        if ((url as string).includes("/api/generate/start"))
          return makeOkResponse({ job_id: "job-abc" });
        return Promise.reject(new Error(`Unexpected: ${url}`));
      });

      await act(async () => {
        await result.current.startJob();
      });

      return mockEventSourceInstances[0];
    }

    it("updates progress state on running message", async () => {
      const { result } = renderHook(() => useGenerator());
      const es = await startJobAndGetES(result);

      act(() => {
        es.simulateMessage(
          JSON.stringify({
            status: "running",
            inserted: 50000,
            total: 1000000,
            throughput: 125000,
            eta_seconds: 7,
          }),
        );
      });

      await waitFor(() => expect(result.current.progress).not.toBeNull());
      expect(result.current.progress?.inserted).toBe(50000);
      expect(result.current.progress?.total).toBe(1000000);
      expect(result.current.progress?.throughput).toBe(125000);
      expect(result.current.progress?.eta_seconds).toBe(7);
      expect(result.current.progress?.status).toBe("running");
    });

    it("sets jobActive to false on terminal status 'complete'", async () => {
      const { result } = renderHook(() => useGenerator());
      const es = await startJobAndGetES(result);

      act(() => {
        es.simulateMessage(
          JSON.stringify({
            status: "complete",
            inserted: 1000000,
            total: 1000000,
            elapsed_ms: 8200,
          }),
        );
      });

      await waitFor(() => expect(result.current.jobActive).toBe(false));
    });

    it("sets jobActive to false on terminal status 'failed'", async () => {
      const { result } = renderHook(() => useGenerator());
      const es = await startJobAndGetES(result);

      act(() => {
        es.simulateMessage(
          JSON.stringify({
            status: "failed",
            inserted: 10000,
            total: 1000000,
            elapsed_ms: 1000,
          }),
        );
      });

      await waitFor(() => expect(result.current.jobActive).toBe(false));
    });

    it("sets jobActive to false on terminal status 'cancelled'", async () => {
      const { result } = renderHook(() => useGenerator());
      const es = await startJobAndGetES(result);

      act(() => {
        es.simulateMessage(
          JSON.stringify({
            status: "cancelled",
            inserted: 20000,
            total: 1000000,
            elapsed_ms: 2000,
          }),
        );
      });

      await waitFor(() => expect(result.current.jobActive).toBe(false));
    });

    it("closes the EventSource after terminal status", async () => {
      const { result } = renderHook(() => useGenerator());
      const es = await startJobAndGetES(result);

      act(() => {
        es.simulateMessage(
          JSON.stringify({
            status: "complete",
            inserted: 1000000,
            total: 1000000,
            elapsed_ms: 8200,
          }),
        );
      });

      await waitFor(() => expect(result.current.jobActive).toBe(false));
      expect(es.close).toHaveBeenCalled();
    });
  });

  // ── cancelJob ─────────────────────────────────────────────────────────────

  describe("cancelJob", () => {
    it("calls POST /api/generate/[job_id]/cancel", async () => {
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/generate/jobs"))
          return makeOkResponse([]);
        if ((url as string).includes("/api/generate/start"))
          return makeOkResponse({ job_id: "job-xyz" });
        if ((url as string).includes("/cancel"))
          return makeOkResponse({ cancelled: true });
        return Promise.reject(new Error(`Unexpected: ${url}`));
      });

      const { result } = renderHook(() => useGenerator());

      await act(async () => {
        await result.current.startJob();
      });
      await act(async () => {
        await result.current.cancelJob();
      });

      const cancelCall = (mockFetch.mock.calls as [string, RequestInit][]).find(
        ([url]) => url.includes("/cancel"),
      );
      expect(cancelCall).toBeDefined();
      expect(cancelCall![0]).toBe("/api/generate/job-xyz/cancel");
      expect(cancelCall![1].method).toBe("POST");
    });
  });

  // ── identity_resolution toggle ────────────────────────────────────────────

  describe("setForm identity_resolution", () => {
    it("toggling identity_resolution off resets anonymous_ratio to 0", () => {
      const { result } = renderHook(() => useGenerator());
      expect(result.current.form.anonymous_ratio).toBe(30);

      act(() => {
        result.current.setForm({ identity_resolution: false });
      });

      expect(result.current.form.identity_resolution).toBe(false);
      expect(result.current.form.anonymous_ratio).toBe(0);
    });

    it("toggling identity_resolution on keeps anonymous_ratio at 0", () => {
      const { result } = renderHook(() => useGenerator());

      act(() => {
        result.current.setForm({ identity_resolution: false });
      });
      act(() => {
        result.current.setForm({ identity_resolution: true });
      });

      // Turning back on should not auto-restore ratio — user must set it
      expect(result.current.form.identity_resolution).toBe(true);
      expect(result.current.form.anonymous_ratio).toBe(0);
    });
  });
});
