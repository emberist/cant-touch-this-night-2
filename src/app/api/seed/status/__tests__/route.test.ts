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

import { GET } from "@/app/api/seed/status/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQueryResult(cnt: string): {
  json: () => Promise<{ cnt: string }[]>;
} {
  return { json: () => Promise.resolve([{ cnt }]) };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQuery
    .mockResolvedValueOnce(makeQueryResult("12000"))
    .mockResolvedValueOnce(makeQueryResult("60"));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/seed/status", () => {
  describe("success — 200", () => {
    it("returns 200 with events and users fields", async () => {
      const res = await GET();

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("events");
      expect(body).toHaveProperty("users");
    });

    it("returns numeric values for events and users (not strings)", async () => {
      const res = await GET();

      const body = await res.json();
      expect(typeof body.events).toBe("number");
      expect(typeof body.users).toBe("number");
    });

    it("converts ClickHouse string counts to numbers", async () => {
      const res = await GET();

      const body = await res.json();
      expect(body.events).toBe(12000);
      expect(body.users).toBe(60);
    });

    it("handles zero counts (empty database) returning 0 for both fields", async () => {
      mockQuery.mockReset();
      mockQuery
        .mockResolvedValueOnce(makeQueryResult("0"))
        .mockResolvedValueOnce(makeQueryResult("0"));

      const res = await GET();

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.events).toBe(0);
      expect(body.users).toBe(0);
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
