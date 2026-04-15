// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEventExplorer } from "@/components/explore/useEventExplorer";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sampleEvent = {
  event_id: "uuid-1",
  event_name: "Page Viewed",
  timestamp: "2026-04-15T10:00:00.000Z",
  device_id: "dev-1",
  user_id: null,
  properties: "{}",
  ingested_at: "2026-04-15T10:00:00.100Z",
  resolved_id: "dev-1",
};

function makeFetchResponse(
  events: unknown[],
  next_cursor: string | null = null,
) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ events, next_cursor }),
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReturnValue(makeFetchResponse([sampleEvent], null));
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useEventExplorer", () => {
  describe("initial fetch", () => {
    it("fetches events from /api/events/list on mount", async () => {
      renderHook(() => useEventExplorer());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = new URL(mockFetch.mock.calls[0][0] as string);
      expect(url.pathname).toBe("/api/events/list");
    });

    it("populates events after initial fetch", async () => {
      const { result } = renderHook(() => useEventExplorer());
      await waitFor(() => expect(result.current.events).toHaveLength(1));
      expect(result.current.events[0].event_id).toBe("uuid-1");
    });
  });

  describe("loading state", () => {
    it("sets loading to true during fetch", async () => {
      let resolveFetch!: (v: unknown) => void;
      mockFetch.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );

      const { result } = renderHook(() => useEventExplorer());
      // Loading should become true while the fetch is pending
      await waitFor(() => expect(result.current.loading).toBe(true));

      // Resolve the fetch so cleanup doesn't hang
      act(() => {
        resolveFetch({
          ok: true,
          json: () => Promise.resolve({ events: [], next_cursor: null }),
        });
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("sets loading to false after fetch completes", async () => {
      const { result } = renderHook(() => useEventExplorer());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.events).toHaveLength(1);
    });
  });

  describe("hasMore", () => {
    it("hasMore is false when API returns next_cursor: null", async () => {
      mockFetch.mockReturnValue(makeFetchResponse([sampleEvent], null));
      const { result } = renderHook(() => useEventExplorer());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasMore).toBe(false);
    });

    it("hasMore is true when API returns a next_cursor", async () => {
      mockFetch.mockReturnValue(
        makeFetchResponse([sampleEvent], "2026-04-14T10:00:00.000Z"),
      );
      const { result } = renderHook(() => useEventExplorer());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe("loadMore", () => {
    it("appends the next page of events using the cursor", async () => {
      const secondEvent = { ...sampleEvent, event_id: "uuid-2" };
      mockFetch
        .mockReturnValueOnce(
          makeFetchResponse([sampleEvent], "2026-04-14T10:00:00.000Z"),
        )
        .mockReturnValueOnce(makeFetchResponse([secondEvent], null));

      const { result } = renderHook(() => useEventExplorer());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.loadMore();
      });
      await waitFor(() => expect(result.current.events).toHaveLength(2));

      // Second fetch should include the cursor as 'before' param
      const url = new URL(mockFetch.mock.calls[1][0] as string);
      expect(url.searchParams.get("before")).toBe("2026-04-14T10:00:00.000Z");
    });

    it("does not fetch if hasMore is false", async () => {
      // Initial fetch returns no cursor → hasMore=false
      mockFetch.mockReturnValue(makeFetchResponse([sampleEvent], null));
      const { result } = renderHook(() => useEventExplorer());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.loadMore();
      });

      // Still only 1 fetch call (the initial one)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("setFilter", () => {
    it("re-fetches with event_name param when filter is set", async () => {
      const { result } = renderHook(() => useEventExplorer());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setFilter("Purchase Completed");
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Second fetch call should include event_name
      const url = new URL(mockFetch.mock.calls[1][0] as string);
      expect(url.searchParams.get("event_name")).toBe("Purchase Completed");
    });

    it("resets events list when filter changes", async () => {
      // Second fetch returns a different event
      const filteredEvent = {
        ...sampleEvent,
        event_id: "uuid-filtered",
        event_name: "Purchase Completed",
      };
      mockFetch
        .mockReturnValueOnce(makeFetchResponse([sampleEvent], null))
        .mockReturnValueOnce(makeFetchResponse([filteredEvent], null));

      const { result } = renderHook(() => useEventExplorer());
      await waitFor(() => expect(result.current.events).toHaveLength(1));

      act(() => {
        result.current.setFilter("Purchase Completed");
      });
      await waitFor(() =>
        expect(result.current.events[0]?.event_id).toBe("uuid-filtered"),
      );
      // Should be exactly the filtered result, not combined
      expect(result.current.events).toHaveLength(1);
    });

    it("updates filter state", async () => {
      const { result } = renderHook(() => useEventExplorer());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setFilter("Button Clicked");
      });
      expect(result.current.filter).toBe("Button Clicked");
    });

    it("passes null filter (clears filter)", async () => {
      const { result } = renderHook(() => useEventExplorer());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setFilter(null);
      });
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

      const url = new URL(mockFetch.mock.calls[1][0] as string);
      expect(url.searchParams.get("event_name")).toBeNull();
    });
  });
});
