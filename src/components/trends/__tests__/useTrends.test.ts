// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTrends } from "@/components/trends/useTrends";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sampleSchema = {
  event_names: ["Page Viewed", "Purchase Completed", "Signup Completed"],
  properties: {
    "Purchase Completed": {
      amount: "numeric" as const,
      currency: "string" as const,
      plan: "string" as const,
      quantity: "numeric" as const,
    },
    "Page Viewed": {
      page: "string" as const,
      duration_seconds: "numeric" as const,
    },
  },
};

const sampleSeries = [
  {
    label: "Page Viewed",
    data: [
      { date: "2026-04-01", value: 100 },
      { date: "2026-04-02", value: 120 },
    ],
  },
];

// ─── Fetch mocking ────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

function makeResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

function schemaResponse() {
  return makeResponse(sampleSchema);
}

function trendsResponse() {
  return makeResponse({ series: sampleSeries });
}

function errorResponse() {
  return Promise.reject(new Error("network error"));
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockImplementation((url: string) => {
    if ((url as string).includes("/api/schema")) return schemaResponse();
    if ((url as string).includes("/api/trends")) return trendsResponse();
    return errorResponse();
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useTrends", () => {
  describe("schema fetch on mount", () => {
    it("fetches /api/schema on mount", async () => {
      renderHook(() => useTrends());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const calls = (mockFetch.mock.calls as [string][]).map(([url]) => url);
      expect(calls.some((url) => url.includes("/api/schema"))).toBe(true);
    });

    it("exposes event names from schema after mount", async () => {
      const { result } = renderHook(() => useTrends());
      await waitFor(() => expect(result.current.schema).not.toBeNull());
      expect(result.current.schema?.event_names).toEqual(
        sampleSchema.event_names,
      );
    });

    it("exposes properties from schema after mount", async () => {
      const { result } = renderHook(() => useTrends());
      await waitFor(() => expect(result.current.schema).not.toBeNull());
      expect(result.current.schema?.properties).toEqual(
        sampleSchema.properties,
      );
    });
  });

  describe("defaults", () => {
    it("measure defaults to 'count'", async () => {
      const { result } = renderHook(() => useTrends());
      expect(result.current.controls.measure).toBe("count");
    });

    it("granularity defaults to 'day'", async () => {
      const { result } = renderHook(() => useTrends());
      expect(result.current.controls.granularity).toBe("day");
    });

    it("eventName defaults to null", async () => {
      const { result } = renderHook(() => useTrends());
      expect(result.current.controls.eventName).toBeNull();
    });

    it("breakdown defaults to null", async () => {
      const { result } = renderHook(() => useTrends());
      expect(result.current.controls.breakdown).toBeNull();
    });

    it("breakdownLimit defaults to 10", async () => {
      const { result } = renderHook(() => useTrends());
      expect(result.current.controls.breakdownLimit).toBe(10);
    });

    it("startDate defaults to approximately 30 days ago (YYYY-MM-DD format)", async () => {
      const { result } = renderHook(() => useTrends());
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const expectedStart = thirtyDaysAgo.toISOString().slice(0, 10);
      expect(result.current.controls.startDate).toBe(expectedStart);
    });

    it("endDate defaults to today (YYYY-MM-DD format)", async () => {
      const { result } = renderHook(() => useTrends());
      const today = new Date().toISOString().slice(0, 10);
      expect(result.current.controls.endDate).toBe(today);
    });
  });

  describe("trends fetch", () => {
    it("does not fetch /api/trends on mount when eventName is null", async () => {
      renderHook(() => useTrends());
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      const calls = (mockFetch.mock.calls as [string][]).map(([url]) => url);
      expect(calls.every((url) => !url.includes("/api/trends"))).toBe(true);
    });

    it("fetches /api/trends when eventName is set", async () => {
      const { result } = renderHook(() => useTrends());
      await waitFor(() => expect(result.current.schema).not.toBeNull());

      act(() => {
        result.current.setters.setEventName("Page Viewed");
      });

      await waitFor(() => {
        const calls = (mockFetch.mock.calls as [string][]).map(([url]) => url);
        return calls.some((url) => url.includes("/api/trends"));
      });

      const trendsCalls = (mockFetch.mock.calls as [string][])
        .map(([url]) => url)
        .filter((url) => url.includes("/api/trends"));
      expect(trendsCalls.length).toBeGreaterThan(0);
    });

    it("includes event_name in the trends fetch URL", async () => {
      const { result } = renderHook(() => useTrends());
      await waitFor(() => expect(result.current.schema).not.toBeNull());

      act(() => {
        result.current.setters.setEventName("Purchase Completed");
      });

      await waitFor(() => {
        const calls = (mockFetch.mock.calls as [string][]).map(([url]) => url);
        return calls.some(
          (url) =>
            url.includes("/api/trends") &&
            url.includes("event_name=Purchase+Completed"),
        );
      });
    });

    it("changing eventName triggers a new trends fetch", async () => {
      const { result } = renderHook(() => useTrends());
      await waitFor(() => expect(result.current.schema).not.toBeNull());

      act(() => {
        result.current.setters.setEventName("Page Viewed");
      });
      await waitFor(() => result.current.series.length > 0);

      act(() => {
        result.current.setters.setEventName("Purchase Completed");
      });

      await waitFor(() => {
        const calls = (mockFetch.mock.calls as [string][]).map(([url]) => url);
        const trendsCallUrls = calls.filter((url) =>
          url.includes("/api/trends"),
        );
        return trendsCallUrls.some((url) => url.includes("Purchase+Completed"));
      });
    });

    it("populates series after trends fetch", async () => {
      const { result } = renderHook(() => useTrends());
      await waitFor(() => expect(result.current.schema).not.toBeNull());

      act(() => {
        result.current.setters.setEventName("Page Viewed");
      });

      await waitFor(() => expect(result.current.series).toHaveLength(1));
      expect(result.current.series[0].label).toBe("Page Viewed");
    });
  });

  describe("loading state", () => {
    it("sets loading to false after schema fetch completes", async () => {
      const { result } = renderHook(() => useTrends());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("sets loading to true during trends fetch", async () => {
      let resolveTrends!: (v: unknown) => void;
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/schema")) return schemaResponse();
        if ((url as string).includes("/api/trends"))
          return new Promise((resolve) => {
            resolveTrends = resolve;
          });
        return errorResponse();
      });

      const { result } = renderHook(() => useTrends());
      await waitFor(() => expect(result.current.schema).not.toBeNull());

      act(() => {
        result.current.setters.setEventName("Page Viewed");
      });

      await waitFor(() => expect(result.current.loading).toBe(true));

      act(() => {
        resolveTrends({
          ok: true,
          json: () => Promise.resolve({ series: [] }),
        });
      });

      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });

  describe("numericProperties", () => {
    it("returns empty array when eventName is null", async () => {
      const { result } = renderHook(() => useTrends());
      await waitFor(() => expect(result.current.schema).not.toBeNull());
      expect(result.current.numericProperties).toEqual([]);
    });

    it("derives numeric-only properties for the selected event", async () => {
      const { result } = renderHook(() => useTrends());
      await waitFor(() => expect(result.current.schema).not.toBeNull());

      act(() => {
        result.current.setters.setEventName("Purchase Completed");
      });

      await waitFor(() =>
        expect(result.current.numericProperties.length).toBeGreaterThan(0),
      );

      // "amount" and "quantity" are numeric; "currency" and "plan" are strings
      expect(result.current.numericProperties).toContain("amount");
      expect(result.current.numericProperties).toContain("quantity");
      expect(result.current.numericProperties).not.toContain("currency");
      expect(result.current.numericProperties).not.toContain("plan");
    });

    it("returns empty array for an event with no schema properties", async () => {
      const { result } = renderHook(() => useTrends());
      await waitFor(() => expect(result.current.schema).not.toBeNull());

      act(() => {
        result.current.setters.setEventName("Signup Completed");
      });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.numericProperties).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("handles schema fetch error gracefully (schema stays null)", async () => {
      mockFetch.mockImplementation(() => errorResponse());

      const { result } = renderHook(() => useTrends());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.schema).toBeNull();
    });

    it("sets error state when trends fetch fails", async () => {
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/schema")) return schemaResponse();
        if ((url as string).includes("/api/trends")) return errorResponse();
        return errorResponse();
      });

      const { result } = renderHook(() => useTrends());
      await waitFor(() => expect(result.current.schema).not.toBeNull());

      act(() => {
        result.current.setters.setEventName("Page Viewed");
      });

      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.series).toEqual([]);
    });
  });
});
