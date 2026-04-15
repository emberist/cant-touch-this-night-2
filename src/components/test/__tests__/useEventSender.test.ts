// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEventSender } from "@/components/test/useEventSender";

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeOkResponse(body: unknown = {}) {
  return Promise.resolve({
    ok: true,
    status: 201,
    json: () => Promise.resolve(body),
  });
}

function makeErrorResponse(
  status: number,
  body: unknown = { error: "Something went wrong" },
) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useEventSender", () => {
  describe("initial state", () => {
    it("starts with lastDeviceId null", () => {
      const { result } = renderHook(() => useEventSender());
      expect(result.current.lastDeviceId).toBeNull();
    });

    it("starts with loading false", () => {
      const { result } = renderHook(() => useEventSender());
      expect(result.current.loading).toBe(false);
    });
  });

  describe("sendEvent", () => {
    it("calls fetch with POST /api/events and correct JSON body", async () => {
      mockFetch.mockReturnValue(makeOkResponse());
      const { result } = renderHook(() => useEventSender());

      await act(async () => {
        await result.current.sendEvent({
          event_name: "Page Viewed",
          device_id: "dev-1",
        });
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("/api/events");
      expect(init.method).toBe("POST");
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
        "application/json",
      );

      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body.event_name).toBe("Page Viewed");
      expect(body.device_id).toBe("dev-1");
    });

    it("sends full payload including user_id, timestamp, and properties", async () => {
      mockFetch.mockReturnValue(makeOkResponse());
      const { result } = renderHook(() => useEventSender());

      await act(async () => {
        await result.current.sendEvent({
          event_name: "Purchase Completed",
          device_id: "dev-1",
          user_id: "user@example.com",
          timestamp: "2026-04-15T12:00:00.000Z",
          properties: { amount: 49.99, currency: "USD" },
        });
      });

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      ) as Record<string, unknown>;
      expect(body.user_id).toBe("user@example.com");
      expect(body.timestamp).toBe("2026-04-15T12:00:00.000Z");
      expect(body.properties).toEqual({ amount: 49.99, currency: "USD" });
    });

    it("returns success: true on 201 response", async () => {
      mockFetch.mockReturnValue(makeOkResponse());
      const { result } = renderHook(() => useEventSender());

      let sendResult!: { success: boolean };
      await act(async () => {
        sendResult = await result.current.sendEvent({
          event_name: "Page Viewed",
          device_id: "dev-1",
        });
      });

      expect(sendResult.success).toBe(true);
    });

    it("returns success: false and error message on 400 response", async () => {
      mockFetch.mockReturnValue(
        makeErrorResponse(400, { error: "event_name required" }),
      );
      const { result } = renderHook(() => useEventSender());

      let sendResult!: { success: boolean; error?: string };
      await act(async () => {
        sendResult = await result.current.sendEvent({ event_name: "" });
      });

      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toBeTruthy();
    });

    it("returns success: false and error message on 409 response", async () => {
      mockFetch.mockReturnValue(makeErrorResponse(409, { error: "Conflict" }));
      const { result } = renderHook(() => useEventSender());

      let sendResult!: { success: boolean; error?: string };
      await act(async () => {
        sendResult = await result.current.sendEvent({
          event_name: "Page Viewed",
          device_id: "dev-1",
          user_id: "user-2",
        });
      });

      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toBeTruthy();
    });

    it("returns success: false and error message on 500 response", async () => {
      mockFetch.mockReturnValue(
        makeErrorResponse(500, { error: "Internal server error" }),
      );
      const { result } = renderHook(() => useEventSender());

      let sendResult!: { success: boolean; error?: string };
      await act(async () => {
        sendResult = await result.current.sendEvent({
          event_name: "Page Viewed",
          device_id: "dev-1",
        });
      });

      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toBeTruthy();
    });
  });

  describe("lastDeviceId tracking", () => {
    it("updates lastDeviceId after sending an event with device_id (anonymous page view)", async () => {
      mockFetch.mockReturnValue(makeOkResponse());
      const { result } = renderHook(() => useEventSender());

      expect(result.current.lastDeviceId).toBeNull();

      await act(async () => {
        await result.current.sendEvent({
          event_name: "Page Viewed",
          device_id: "dev-123",
        });
      });

      expect(result.current.lastDeviceId).toBe("dev-123");
    });

    it("does not update lastDeviceId when device_id is absent from payload", async () => {
      mockFetch.mockReturnValue(makeOkResponse());
      const { result } = renderHook(() => useEventSender());

      await act(async () => {
        await result.current.sendEvent({
          event_name: "Purchase Completed",
          user_id: "user@example.com",
        });
      });

      expect(result.current.lastDeviceId).toBeNull();
    });

    it("updates lastDeviceId to the most recent device_id sent", async () => {
      mockFetch.mockReturnValue(makeOkResponse());
      const { result } = renderHook(() => useEventSender());

      await act(async () => {
        await result.current.sendEvent({
          event_name: "Page Viewed",
          device_id: "dev-1",
        });
      });
      expect(result.current.lastDeviceId).toBe("dev-1");

      await act(async () => {
        await result.current.sendEvent({
          event_name: "Page Viewed",
          device_id: "dev-2",
        });
      });
      expect(result.current.lastDeviceId).toBe("dev-2");
    });
  });

  describe("sendSeed", () => {
    it("calls POST /api/seed", async () => {
      mockFetch.mockReturnValueOnce(makeOkResponse({})).mockReturnValueOnce(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ event_count: 12000, user_count: 70 }),
        }),
      );
      const { result } = renderHook(() => useEventSender());

      await act(async () => {
        await result.current.sendSeed();
      });

      const seedCall = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(seedCall[0]).toBe("/api/seed");
      expect(seedCall[1].method).toBe("POST");
    });

    it("returns success: true and eventCount on success", async () => {
      mockFetch.mockReturnValueOnce(makeOkResponse({})).mockReturnValueOnce(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ event_count: 12000, user_count: 70 }),
        }),
      );
      const { result } = renderHook(() => useEventSender());

      let seedResult!: { success: boolean; eventCount?: number };
      await act(async () => {
        seedResult = await result.current.sendSeed();
      });

      expect(seedResult.success).toBe(true);
      expect(seedResult.eventCount).toBe(12000);
    });

    it("returns success: false and error message when /api/seed returns an error", async () => {
      mockFetch.mockReturnValue(
        makeErrorResponse(500, { error: "Seed failed" }),
      );
      const { result } = renderHook(() => useEventSender());

      let seedResult!: { success: boolean; error?: string };
      await act(async () => {
        seedResult = await result.current.sendSeed();
      });

      expect(seedResult.success).toBe(false);
      expect(seedResult.error).toBeTruthy();
    });

    it("returns success: false when fetch throws (network error)", async () => {
      mockFetch.mockReturnValue(Promise.reject(new Error("Network error")));
      const { result } = renderHook(() => useEventSender());

      let seedResult!: { success: boolean; error?: string };
      await act(async () => {
        seedResult = await result.current.sendSeed();
      });

      expect(seedResult.success).toBe(false);
      expect(seedResult.error).toBeTruthy();
    });
  });

  describe("loading state", () => {
    it("is false before any request", () => {
      const { result } = renderHook(() => useEventSender());
      expect(result.current.loading).toBe(false);
    });

    it("is true during an in-flight sendEvent, false after completion", async () => {
      let resolveRequest!: (v: unknown) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
      );

      const { result } = renderHook(() => useEventSender());

      act(() => {
        void result.current.sendEvent({
          event_name: "Page Viewed",
          device_id: "dev-1",
        });
      });

      await waitFor(() => expect(result.current.loading).toBe(true));

      act(() => {
        resolveRequest({
          ok: true,
          status: 201,
          json: () => Promise.resolve({}),
        });
      });

      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("is true during an in-flight sendSeed, false after completion", async () => {
      let resolveRequest!: (v: unknown) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
      );

      const { result } = renderHook(() => useEventSender());

      act(() => {
        void result.current.sendSeed();
      });

      await waitFor(() => expect(result.current.loading).toBe(true));

      act(() => {
        resolveRequest({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        });
      });

      // After seed POST resolves, sendSeed then fetches /api/seed/status — mock that too
      mockFetch.mockReturnValueOnce(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ event_count: 0, user_count: 0 }),
        }),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });
});
