// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUserSearch } from "@/components/users/useUserSearch";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sampleUser = {
  resolved_id: "user@example.com",
  first_seen: "2026-03-01T10:00:00.000Z",
  last_seen: "2026-04-10T15:30:00.000Z",
  event_count: 42,
};

const sampleUser2 = {
  resolved_id: "device-abc",
  first_seen: "2026-03-05T08:00:00.000Z",
  last_seen: "2026-04-09T12:00:00.000Z",
  event_count: 7,
};

function makeFetchResponse(
  users: unknown[],
  next_cursor: string | null = null,
) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ users, next_cursor }),
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReturnValue(makeFetchResponse([sampleUser], null));
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useUserSearch", () => {
  describe("initial fetch", () => {
    it("fetches users from /api/users on mount", async () => {
      renderHook(() => useUserSearch());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = new URL(mockFetch.mock.calls[0][0] as string);
      expect(url.pathname).toBe("/api/users");
    });

    it("populates users array after initial fetch", async () => {
      const { result } = renderHook(() => useUserSearch());
      await waitFor(() => expect(result.current.users).toHaveLength(1));
      expect(result.current.users[0].resolved_id).toBe("user@example.com");
    });

    it("does not include a q param on initial mount", async () => {
      renderHook(() => useUserSearch());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const url = new URL(mockFetch.mock.calls[0][0] as string);
      expect(url.searchParams.get("q")).toBeNull();
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

      const { result } = renderHook(() => useUserSearch());
      await waitFor(() => expect(result.current.loading).toBe(true));

      act(() => {
        resolveFetch({
          ok: true,
          json: () => Promise.resolve({ users: [], next_cursor: null }),
        });
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("sets loading to false after fetch completes", async () => {
      const { result } = renderHook(() => useUserSearch());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.users).toHaveLength(1);
    });
  });

  describe("hasMore", () => {
    it("hasMore is false when API returns next_cursor: null", async () => {
      mockFetch.mockReturnValue(makeFetchResponse([sampleUser], null));
      const { result } = renderHook(() => useUserSearch());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasMore).toBe(false);
    });

    it("hasMore is true when API returns a next_cursor", async () => {
      mockFetch.mockReturnValue(
        makeFetchResponse([sampleUser], "user@example.com"),
      );
      const { result } = renderHook(() => useUserSearch());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe("loadMore", () => {
    it("appends the next page using the cursor", async () => {
      mockFetch
        .mockReturnValueOnce(
          makeFetchResponse([sampleUser], "user@example.com"),
        )
        .mockReturnValueOnce(makeFetchResponse([sampleUser2], null));

      const { result } = renderHook(() => useUserSearch());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.loadMore();
      });
      await waitFor(() => expect(result.current.users).toHaveLength(2));

      const url = new URL(mockFetch.mock.calls[1][0] as string);
      expect(url.searchParams.get("cursor")).toBe("user@example.com");
    });

    it("is a no-op when hasMore is false", async () => {
      mockFetch.mockReturnValue(makeFetchResponse([sampleUser], null));
      const { result } = renderHook(() => useUserSearch());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.loadMore();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when loading is true", async () => {
      let resolveFetch!: (v: unknown) => void;
      mockFetch
        .mockReturnValueOnce(
          makeFetchResponse([sampleUser], "user@example.com"),
        )
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
        );

      const { result } = renderHook(() => useUserSearch());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Trigger loadMore, which will start loading
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => expect(result.current.loading).toBe(true));

      // Call loadMore again while still loading — should be a no-op
      act(() => {
        result.current.loadMore();
      });

      // Only 2 calls: initial + first loadMore
      expect(mockFetch).toHaveBeenCalledTimes(2);

      act(() => {
        resolveFetch({
          ok: true,
          json: () =>
            Promise.resolve({ users: [sampleUser2], next_cursor: null }),
        });
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });

  describe("setQuery", () => {
    it("re-fetches with q param when query is set", async () => {
      const { result } = renderHook(() => useUserSearch());

      // Let the initial mount fetch complete with real timers
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      // Switch to fake timers for debounce control
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      act(() => {
        result.current.setQuery("test@");
      });

      // Fire the debounce timer and flush the resulting async fetch
      await act(async () => {
        vi.advanceTimersByTime(400);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const url = new URL(mockFetch.mock.calls[1][0] as string);
      expect(url.searchParams.get("q")).toBe("test@");
    });

    it("resets users list and cursor when query changes", async () => {
      const filteredUser = {
        ...sampleUser,
        resolved_id: "filtered@example.com",
      };

      mockFetch
        .mockReturnValueOnce(makeFetchResponse([sampleUser], null))
        .mockReturnValueOnce(makeFetchResponse([filteredUser], null));

      const { result } = renderHook(() => useUserSearch());

      await waitFor(() => expect(result.current.users).toHaveLength(1));

      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      act(() => {
        result.current.setQuery("filtered");
      });
      await act(async () => {
        vi.advanceTimersByTime(400);
      });

      expect(result.current.users).toHaveLength(1);
      expect(result.current.users[0]?.resolved_id).toBe("filtered@example.com");
    });

    it("setQuery('') fetches without q param", async () => {
      const { result } = renderHook(() => useUserSearch());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      // First set a query, then clear it
      act(() => {
        result.current.setQuery("something");
      });
      await act(async () => {
        vi.advanceTimersByTime(400);
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      act(() => {
        result.current.setQuery("");
      });
      await act(async () => {
        vi.advanceTimersByTime(400);
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);

      const url = new URL(mockFetch.mock.calls[2][0] as string);
      expect(url.searchParams.get("q")).toBeNull();
    });

    it("debounces rapid setQuery calls — only one fetch after settling", async () => {
      const { result } = renderHook(() => useUserSearch());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      // Rapid-fire three calls within the debounce window
      act(() => {
        result.current.setQuery("a");
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      act(() => {
        result.current.setQuery("ab");
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      act(() => {
        result.current.setQuery("abc");
      });

      // Advance past the debounce window and flush the async fetch
      await act(async () => {
        vi.advanceTimersByTime(400);
      });

      // Only one additional fetch (the initial mount fetch already counted)
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // The final fetch should use the last query value
      const url = new URL(mockFetch.mock.calls[1][0] as string);
      expect(url.searchParams.get("q")).toBe("abc");
    });
  });
});
