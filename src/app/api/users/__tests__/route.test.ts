import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const { mockSearchUsers } = vi.hoisted(() => ({
  mockSearchUsers: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  searchUsers: mockSearchUsers,
}));

import { GET } from "@/app/api/users/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost/api/users");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

const sampleResponse = {
  users: [
    {
      resolved_id: "user@test.com",
      first_seen: "2026-04-01T00:00:00.000Z",
      last_seen: "2026-04-15T00:00:00.000Z",
      event_count: 42,
    },
  ],
  next_cursor: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSearchUsers.mockResolvedValue(sampleResponse);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/users", () => {
  describe("success — 200", () => {
    it("returns 200 with users array and next_cursor", async () => {
      const res = await GET(makeRequest());

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("users");
      expect(body).toHaveProperty("next_cursor");
      expect(Array.isArray(body.users)).toBe(true);
    });

    it("forwards q, limit, cursor params to searchUsers", async () => {
      await GET(
        makeRequest({ q: "john", limit: "25", cursor: "abc@test.com" }),
      );

      expect(mockSearchUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          q: "john",
          limit: 25,
          cursor: "abc@test.com",
        }),
      );
    });

    it("defaults limit to 50 when not provided", async () => {
      await GET(makeRequest());

      expect(mockSearchUsers).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
      );
    });

    it("caps limit at 200", async () => {
      await GET(makeRequest({ limit: "500" }));

      expect(mockSearchUsers).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 200 }),
      );
    });
  });

  describe("validation errors — 400", () => {
    it("returns 400 when limit is not a positive integer", async () => {
      const res = await GET(makeRequest({ limit: "abc" }));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    });

    it("returns 400 for zero limit", async () => {
      const res = await GET(makeRequest({ limit: "0" }));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 for negative limit", async () => {
      const res = await GET(makeRequest({ limit: "-5" }));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });

  describe("error handling — 500", () => {
    it("returns 500 when searchUsers throws", async () => {
      mockSearchUsers.mockRejectedValue(
        new Error("ClickHouse connection failed"),
      );

      const res = await GET(makeRequest());

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });
});
