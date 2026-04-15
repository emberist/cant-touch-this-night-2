// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveFeed } from "@/components/test/useLiveFeed";
import type { EventRow } from "@/lib/identity";

// ─── Mock EventSource ─────────────────────────────────────────────────────────

class MockEventSource {
  static lastInstance: MockEventSource | null = null;

  url: string;
  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  readyState = 0;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.lastInstance = this;
  }

  simulateOpen(): void {
    this.readyState = 1;
    this.onopen?.(new Event("open"));
  }

  simulateMessage(data: string): void {
    this.onmessage?.(new MessageEvent("message", { data }));
  }

  simulateError(): void {
    this.readyState = 2;
    this.onerror?.(new Event("error"));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEventRow(id: string, overrides: Partial<EventRow> = {}): EventRow {
  return {
    event_id: id,
    event_name: "Page Viewed",
    timestamp: "2026-04-15T12:00:00.000Z",
    device_id: "device-abc",
    user_id: null,
    properties: '{"page":"/home"}',
    ingested_at: "2026-04-15T12:00:00.000Z",
    resolved_id: "device-abc",
    ...overrides,
  };
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("EventSource", MockEventSource);
  MockEventSource.lastInstance = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useLiveFeed", () => {
  describe("initial state", () => {
    it("starts with empty events array, disconnected status, and paused false", () => {
      const { result } = renderHook(() => useLiveFeed());
      expect(result.current.events).toEqual([]);
      expect(result.current.connectionStatus).toBe("disconnected");
      expect(result.current.paused).toBe(false);
    });
  });

  describe("EventSource lifecycle", () => {
    it("opens an EventSource to /api/live on mount", () => {
      renderHook(() => useLiveFeed());
      expect(MockEventSource.lastInstance).not.toBeNull();
      expect(MockEventSource.lastInstance!.url).toBe("/api/live");
    });

    it("closes the EventSource when the hook unmounts", () => {
      const { unmount } = renderHook(() => useLiveFeed());
      const es = MockEventSource.lastInstance!;
      unmount();
      expect(es.close).toHaveBeenCalledOnce();
    });
  });

  describe("connection status", () => {
    it("transitions to 'live' when EventSource opens", () => {
      const { result } = renderHook(() => useLiveFeed());
      const es = MockEventSource.lastInstance!;

      act(() => {
        es.simulateOpen();
      });

      expect(result.current.connectionStatus).toBe("live");
    });

    it("transitions to 'disconnected' when EventSource fires error", () => {
      const { result } = renderHook(() => useLiveFeed());
      const es = MockEventSource.lastInstance!;

      act(() => {
        es.simulateOpen();
      });
      expect(result.current.connectionStatus).toBe("live");

      act(() => {
        es.simulateError();
      });
      expect(result.current.connectionStatus).toBe("disconnected");
    });
  });

  describe("receiving messages", () => {
    it("prepends incoming SSE messages to the list (newest first)", () => {
      const { result } = renderHook(() => useLiveFeed());
      const es = MockEventSource.lastInstance!;

      act(() => {
        es.simulateMessage(JSON.stringify(makeEventRow("ev-1")));
      });
      act(() => {
        es.simulateMessage(JSON.stringify(makeEventRow("ev-2")));
      });

      expect(result.current.events).toHaveLength(2);
      // ev-2 arrived last → newest → index 0
      expect(result.current.events[0].event_id).toBe("ev-2");
      expect(result.current.events[1].event_id).toBe("ev-1");
    });

    it("caps the list at 200 events; when a 201st arrives the oldest is dropped", () => {
      const { result } = renderHook(() => useLiveFeed());
      const es = MockEventSource.lastInstance!;

      // Fill with 200 events
      act(() => {
        for (let i = 0; i < 200; i++) {
          es.simulateMessage(JSON.stringify(makeEventRow(`ev-${i}`)));
        }
      });
      expect(result.current.events).toHaveLength(200);
      // Newest is ev-199 at index 0, oldest is ev-0 at index 199
      expect(result.current.events[0].event_id).toBe("ev-199");
      expect(result.current.events[199].event_id).toBe("ev-0");

      // Add 201st event
      act(() => {
        es.simulateMessage(JSON.stringify(makeEventRow("ev-200")));
      });

      expect(result.current.events).toHaveLength(200);
      // Newest is still at index 0
      expect(result.current.events[0].event_id).toBe("ev-200");
      // Oldest (ev-0) was dropped
      expect(
        result.current.events.find((e) => e.event_id === "ev-0"),
      ).toBeUndefined();
    });
  });

  describe("pause / resume", () => {
    it("togglePause sets paused to true; incoming events during pause go to buffer, not state", () => {
      const { result } = renderHook(() => useLiveFeed());
      const es = MockEventSource.lastInstance!;

      act(() => {
        result.current.togglePause();
      });
      expect(result.current.paused).toBe(true);

      // Message arrives while paused — should NOT appear in events
      act(() => {
        es.simulateMessage(JSON.stringify(makeEventRow("buffered")));
      });
      expect(result.current.events).toHaveLength(0);
    });

    it("resuming flushes buffered events into state (newest first, prepended before existing)", () => {
      const { result } = renderHook(() => useLiveFeed());
      const es = MockEventSource.lastInstance!;

      // One event before pause
      act(() => {
        es.simulateMessage(JSON.stringify(makeEventRow("pre-pause")));
      });
      expect(result.current.events).toHaveLength(1);

      // Pause
      act(() => {
        result.current.togglePause();
      });

      // Two events while paused
      act(() => {
        es.simulateMessage(JSON.stringify(makeEventRow("buf-1")));
        es.simulateMessage(JSON.stringify(makeEventRow("buf-2")));
      });
      // State should still hold only the 1 pre-pause event
      expect(result.current.events).toHaveLength(1);

      // Resume — buffer should flush
      act(() => {
        result.current.togglePause();
      });

      expect(result.current.paused).toBe(false);
      expect(result.current.events).toHaveLength(3);
      // Buffered events (buf-2 is newest) should be prepended
      expect(result.current.events[0].event_id).toBe("buf-2");
      expect(result.current.events[1].event_id).toBe("buf-1");
      expect(result.current.events[2].event_id).toBe("pre-pause");
    });
  });

  describe("clearEvents", () => {
    it("resets the events array to empty", () => {
      const { result } = renderHook(() => useLiveFeed());
      const es = MockEventSource.lastInstance!;

      act(() => {
        es.simulateMessage(JSON.stringify(makeEventRow("ev-1")));
        es.simulateMessage(JSON.stringify(makeEventRow("ev-2")));
      });
      expect(result.current.events).toHaveLength(2);

      act(() => {
        result.current.clearEvents();
      });

      expect(result.current.events).toHaveLength(0);
    });

    it("also clears events buffered during pause", () => {
      const { result } = renderHook(() => useLiveFeed());
      const es = MockEventSource.lastInstance!;

      act(() => {
        result.current.togglePause();
      });
      act(() => {
        es.simulateMessage(JSON.stringify(makeEventRow("buf-1")));
      });

      act(() => {
        result.current.clearEvents();
      });

      // Resume — nothing should be flushed
      act(() => {
        result.current.togglePause();
      });

      expect(result.current.events).toHaveLength(0);
    });
  });
});
