// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFunnels } from "@/components/funnels/useFunnels";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sampleSchema = {
  event_names: ["Page Viewed", "Signup Completed", "Purchase Completed"],
  properties: {
    "Purchase Completed": {
      amount: "numeric" as const,
      currency: "string" as const,
    },
  },
};

const sampleFunnelResponse = {
  steps: [
    {
      name: "Page Viewed",
      users: 1000,
      conversion_from_prev: null,
      conversion_overall: 1.0,
    },
    {
      name: "Purchase Completed",
      users: 88,
      conversion_from_prev: 0.088,
      conversion_overall: 0.088,
    },
  ],
};

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

function funnelResponse() {
  return makeResponse(sampleFunnelResponse);
}

function errorResponse() {
  return Promise.reject(new Error("network error"));
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockImplementation((url: string) => {
    if ((url as string).includes("/api/schema")) return schemaResponse();
    return errorResponse();
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useFunnels", () => {
  describe("initial state", () => {
    it("starts with 2 empty steps", () => {
      const { result } = renderHook(() => useFunnels());
      expect(result.current.steps).toHaveLength(2);
      expect(result.current.steps[0]).toBe("");
      expect(result.current.steps[1]).toBe("");
    });

    it("starts with null result", () => {
      const { result } = renderHook(() => useFunnels());
      expect(result.current.result).toBeNull();
    });

    it("startDate defaults to approximately 30 days ago (YYYY-MM-DD format)", () => {
      const { result } = renderHook(() => useFunnels());
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const expectedStart = thirtyDaysAgo.toISOString().slice(0, 10);
      expect(result.current.startDate).toBe(expectedStart);
    });

    it("endDate defaults to today (YYYY-MM-DD format)", () => {
      const { result } = renderHook(() => useFunnels());
      const today = new Date().toISOString().slice(0, 10);
      expect(result.current.endDate).toBe(today);
    });
  });

  describe("addStep", () => {
    it("appends an empty step", () => {
      const { result } = renderHook(() => useFunnels());
      act(() => {
        result.current.addStep();
      });
      expect(result.current.steps).toHaveLength(3);
      expect(result.current.steps[2]).toBe("");
    });

    it("is a no-op when already at 5 steps", () => {
      const { result } = renderHook(() => useFunnels());
      act(() => {
        result.current.addStep();
        result.current.addStep();
        result.current.addStep();
      });
      expect(result.current.steps).toHaveLength(5);
      act(() => {
        result.current.addStep();
      });
      expect(result.current.steps).toHaveLength(5);
    });
  });

  describe("removeStep", () => {
    it("removes a step at the given index", () => {
      const { result } = renderHook(() => useFunnels());
      act(() => {
        result.current.setStep(0, "Page Viewed");
        result.current.setStep(1, "Purchase Completed");
        result.current.addStep();
        result.current.setStep(2, "Signup Completed");
      });
      act(() => {
        result.current.removeStep(1);
      });
      expect(result.current.steps).toHaveLength(2);
      expect(result.current.steps[0]).toBe("Page Viewed");
      expect(result.current.steps[1]).toBe("Signup Completed");
    });

    it("is a no-op when at 2 steps", () => {
      const { result } = renderHook(() => useFunnels());
      expect(result.current.steps).toHaveLength(2);
      act(() => {
        result.current.removeStep(0);
      });
      expect(result.current.steps).toHaveLength(2);
    });
  });

  describe("setStep", () => {
    it("updates a step at the given index", () => {
      const { result } = renderHook(() => useFunnels());
      act(() => {
        result.current.setStep(0, "Page Viewed");
      });
      expect(result.current.steps[0]).toBe("Page Viewed");
    });

    it("does not affect other steps when updating one", () => {
      const { result } = renderHook(() => useFunnels());
      act(() => {
        result.current.setStep(0, "Page Viewed");
        result.current.setStep(1, "Purchase Completed");
      });
      act(() => {
        result.current.setStep(0, "Signup Completed");
      });
      expect(result.current.steps[0]).toBe("Signup Completed");
      expect(result.current.steps[1]).toBe("Purchase Completed");
    });
  });

  describe("runFunnel — validation", () => {
    it("does not fetch when both steps are empty", async () => {
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/schema")) return schemaResponse();
        return errorResponse();
      });

      const { result } = renderHook(() => useFunnels());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.runFunnel();
      });

      const funnelCalls = (mockFetch.mock.calls as [string, unknown][]).filter(
        ([url]) => (url as string).includes("/api/funnels"),
      );
      expect(funnelCalls).toHaveLength(0);
    });

    it("does not fetch when only one step is non-empty", async () => {
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/schema")) return schemaResponse();
        return errorResponse();
      });

      const { result } = renderHook(() => useFunnels());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setStep(0, "Page Viewed");
      });
      act(() => {
        result.current.runFunnel();
      });

      const funnelCalls = (mockFetch.mock.calls as [string, unknown][]).filter(
        ([url]) => (url as string).includes("/api/funnels"),
      );
      expect(funnelCalls).toHaveLength(0);
    });

    it("fetches /api/funnels when all steps are non-empty and date range is set", async () => {
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/schema")) return schemaResponse();
        if ((url as string).includes("/api/funnels")) return funnelResponse();
        return errorResponse();
      });

      const { result } = renderHook(() => useFunnels());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setStep(0, "Page Viewed");
        result.current.setStep(1, "Purchase Completed");
      });
      act(() => {
        result.current.runFunnel();
      });

      await waitFor(() => {
        const calls = mockFetch.mock.calls as [string, unknown][];
        return calls.some(([url]) => (url as string).includes("/api/funnels"));
      });

      const funnelCalls = (mockFetch.mock.calls as [string, unknown][]).filter(
        ([url]) => (url as string).includes("/api/funnels"),
      );
      expect(funnelCalls.length).toBeGreaterThan(0);
    });
  });

  describe("loading state", () => {
    it("sets loading=false after initial schema fetch", async () => {
      const { result } = renderHook(() => useFunnels());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("sets loading=true during funnel fetch, false after", async () => {
      let resolveFunnel!: (v: unknown) => void;
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/schema")) return schemaResponse();
        if ((url as string).includes("/api/funnels")) {
          return new Promise((resolve) => {
            resolveFunnel = resolve;
          });
        }
        return errorResponse();
      });

      const { result } = renderHook(() => useFunnels());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setStep(0, "Page Viewed");
        result.current.setStep(1, "Purchase Completed");
      });
      act(() => {
        result.current.runFunnel();
      });

      await waitFor(() => expect(result.current.loading).toBe(true));

      act(() => {
        resolveFunnel({
          ok: true,
          json: () => Promise.resolve(sampleFunnelResponse),
        });
      });

      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });

  describe("result state", () => {
    it("stores funnel response in result on success", async () => {
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/schema")) return schemaResponse();
        if ((url as string).includes("/api/funnels")) return funnelResponse();
        return errorResponse();
      });

      const { result } = renderHook(() => useFunnels());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setStep(0, "Page Viewed");
        result.current.setStep(1, "Purchase Completed");
      });
      act(() => {
        result.current.runFunnel();
      });

      await waitFor(() => expect(result.current.result).not.toBeNull());
      expect(result.current.result?.steps).toHaveLength(2);
    });

    it("sets error state on fetch failure", async () => {
      mockFetch.mockImplementation((url: string) => {
        if ((url as string).includes("/api/schema")) return schemaResponse();
        if ((url as string).includes("/api/funnels")) return errorResponse();
        return errorResponse();
      });

      const { result } = renderHook(() => useFunnels());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setStep(0, "Page Viewed");
        result.current.setStep(1, "Purchase Completed");
      });
      act(() => {
        result.current.runFunnel();
      });

      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.result).toBeNull();
    });
  });
});
