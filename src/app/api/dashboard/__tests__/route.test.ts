import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("@/lib/clickhouse", () => ({
  clickhouse: {
    query: mockQuery,
  },
}));

import { GET } from "@/app/api/dashboard/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCountResult(cnt: string): {
  json: () => Promise<{ cnt: string }[]>;
} {
  return { json: () => Promise.resolve([{ cnt }]) };
}

function makeTopEventResult(rows: { event_name: string; cnt: string }[]): {
  json: () => Promise<{ event_name: string; cnt: string }[]>;
} {
  return { json: () => Promise.resolve(rows) };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQuery
    .mockResolvedValueOnce(makeCountResult("12000"))
    .mockResolvedValueOnce(makeCountResult("60"))
    .mockResolvedValueOnce(
      makeTopEventResult([{ event_name: "Page Viewed", cnt: "4800" }]),
    );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/dashboard", () => {
  describe("success — 200", () => {
    it("returns 200 with total_events, total_users, and top_event_7d fields", async () => {
      const res = await GET();

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("total_events");
      expect(body).toHaveProperty("total_users");
      expect(body).toHaveProperty("top_event_7d");
    });

    it("returns numeric values (not strings) for total_events and total_users", async () => {
      const res = await GET();

      const body = await res.json();
      expect(typeof body.total_events).toBe("number");
      expect(typeof body.total_users).toBe("number");
    });

    it("converts ClickHouse string counts to correct numeric values", async () => {
      const res = await GET();

      const body = await res.json();
      expect(body.total_events).toBe(12000);
      expect(body.total_users).toBe(60);
    });

    it("top_event_7d contains name (string) and count (number) when events exist", async () => {
      const res = await GET();

      const body = await res.json();
      expect(body.top_event_7d).not.toBeNull();
      expect(typeof body.top_event_7d.name).toBe("string");
      expect(typeof body.top_event_7d.count).toBe("number");
      expect(body.top_event_7d.name).toBe("Page Viewed");
      expect(body.top_event_7d.count).toBe(4800);
    });

    it("returns top_event_7d: null when no events exist in the last 7 days", async () => {
      mockQuery.mockReset();
      mockQuery
        .mockResolvedValueOnce(makeCountResult("500"))
        .mockResolvedValueOnce(makeCountResult("10"))
        .mockResolvedValueOnce(makeTopEventResult([]));

      const res = await GET();

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.top_event_7d).toBeNull();
    });

    it("returns 0 for events and users when database is empty", async () => {
      mockQuery.mockReset();
      mockQuery
        .mockResolvedValueOnce(makeCountResult("0"))
        .mockResolvedValueOnce(makeCountResult("0"))
        .mockResolvedValueOnce(makeTopEventResult([]));

      const res = await GET();

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.total_events).toBe(0);
      expect(body.total_users).toBe(0);
      expect(body.top_event_7d).toBeNull();
    });
  });

  describe("failure — 500", () => {
    it("returns 500 with error message when ClickHouse query throws", async () => {
      mockQuery.mockReset();
      mockQuery.mockRejectedValue(new Error("Connection refused"));

      const res = await GET();

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(body.error).toBe("Connection refused");
    });

    it("returns 500 with generic message for non-Error rejections", async () => {
      mockQuery.mockReset();
      mockQuery.mockRejectedValue("unknown failure");

      const res = await GET();

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(body.error).toBe("Internal server error.");
    });
  });
});
