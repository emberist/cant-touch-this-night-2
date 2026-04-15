import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const { mockQueryTrends } = vi.hoisted(() => ({
  mockQueryTrends: vi.fn(),
}));

vi.mock("@/lib/trends", () => ({
  queryTrends: mockQueryTrends,
}));

import { GET } from "@/app/api/trends/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost/api/trends");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

const sampleResponse = {
  series: [
    {
      label: "Page Viewed",
      data: [{ date: "2026-04-01", value: 5 }],
    },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQueryTrends.mockResolvedValue(sampleResponse);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/trends", () => {
  describe("success — 200", () => {
    it("returns 200 with series response shape", async () => {
      const res = await GET(
        makeRequest({
          event_name: "Page Viewed",
          start: "2026-04-01",
          end: "2026-04-15",
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("series");
      expect(Array.isArray(body.series)).toBe(true);
    });

    it("returns the series data from queryTrends in the response body", async () => {
      const res = await GET(
        makeRequest({
          event_name: "Page Viewed",
          start: "2026-04-01",
          end: "2026-04-15",
        }),
      );
      const body = await res.json();

      expect(body.series).toEqual(sampleResponse.series);
    });
  });

  describe("validation errors — 400", () => {
    it("returns 400 when event_name is missing", async () => {
      const res = await GET(
        makeRequest({ start: "2026-04-01", end: "2026-04-15" }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    });

    it("returns 400 when start is missing", async () => {
      const res = await GET(
        makeRequest({ event_name: "Page Viewed", end: "2026-04-15" }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when end is missing", async () => {
      const res = await GET(
        makeRequest({ event_name: "Page Viewed", start: "2026-04-01" }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 for invalid measure format (sum: with no property)", async () => {
      const res = await GET(
        makeRequest({
          event_name: "Page Viewed",
          start: "2026-04-01",
          end: "2026-04-15",
          measure: "sum:",
        }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 for unknown measure", async () => {
      const res = await GET(
        makeRequest({
          event_name: "Page Viewed",
          start: "2026-04-01",
          end: "2026-04-15",
          measure: "unknown",
        }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 for invalid granularity", async () => {
      const res = await GET(
        makeRequest({
          event_name: "Page Viewed",
          start: "2026-04-01",
          end: "2026-04-15",
          granularity: "month",
        }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });

  describe("defaults", () => {
    it("defaults measure to count when not provided", async () => {
      await GET(
        makeRequest({
          event_name: "Page Viewed",
          start: "2026-04-01",
          end: "2026-04-15",
        }),
      );

      expect(mockQueryTrends).toHaveBeenCalledWith(
        expect.objectContaining({ measure: "count" }),
      );
    });

    it("defaults granularity to day when not provided", async () => {
      await GET(
        makeRequest({
          event_name: "Page Viewed",
          start: "2026-04-01",
          end: "2026-04-15",
        }),
      );

      expect(mockQueryTrends).toHaveBeenCalledWith(
        expect.objectContaining({ granularity: "day" }),
      );
    });

    it("defaults breakdown_limit to 10 when not provided", async () => {
      await GET(
        makeRequest({
          event_name: "Page Viewed",
          start: "2026-04-01",
          end: "2026-04-15",
        }),
      );

      expect(mockQueryTrends).toHaveBeenCalledWith(
        expect.objectContaining({ breakdown_limit: 10 }),
      );
    });
  });

  describe("query params forwarding", () => {
    it("forwards all parsed params correctly to queryTrends", async () => {
      await GET(
        makeRequest({
          event_name: "Purchase Completed",
          measure: "sum:amount",
          granularity: "week",
          start: "2026-03-01",
          end: "2026-04-01",
          breakdown: "plan",
          breakdown_limit: "5",
        }),
      );

      expect(mockQueryTrends).toHaveBeenCalledWith({
        event_name: "Purchase Completed",
        measure: "sum:amount",
        granularity: "week",
        start: "2026-03-01",
        end: "2026-04-01",
        breakdown: "plan",
        breakdown_limit: 5,
      });
    });

    it("passes breakdown as undefined when not provided", async () => {
      await GET(
        makeRequest({
          event_name: "Page Viewed",
          start: "2026-04-01",
          end: "2026-04-15",
        }),
      );

      expect(mockQueryTrends).toHaveBeenCalledWith(
        expect.objectContaining({ breakdown: undefined }),
      );
    });
  });

  describe("valid measure variants", () => {
    it.each([
      "count",
      "unique_users",
      "sum:amount",
      "avg:amount",
      "min:price",
      "max:price",
    ])("accepts measure=%s and returns 200", async (measure) => {
      const res = await GET(
        makeRequest({
          event_name: "Page Viewed",
          start: "2026-04-01",
          end: "2026-04-15",
          measure,
        }),
      );

      expect(res.status).toBe(200);
    });
  });
});
