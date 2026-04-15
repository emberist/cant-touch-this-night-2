import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const { mockGetUserProfile } = vi.hoisted(() => ({
  mockGetUserProfile: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  getUserProfile: mockGetUserProfile,
}));

import { GET } from "@/app/api/users/[id]/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TestContext = { params: Promise<{ id: string }> };

function makeRequest(id: string): [Request, TestContext] {
  return [
    new Request(`http://localhost/api/users/${encodeURIComponent(id)}`),
    { params: Promise.resolve({ id }) },
  ];
}

const sampleProfile = {
  resolved_id: "user@test.com",
  first_seen: "2026-04-01T00:00:00.000Z",
  last_seen: "2026-04-15T00:00:00.000Z",
  identity_cluster: {
    user_ids: ["user@test.com"],
    device_ids: ["dev-1"],
  },
  events: [],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGetUserProfile.mockResolvedValue(sampleProfile);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/users/[id]", () => {
  describe("success — 200", () => {
    it("returns 200 with full profile when user exists", async () => {
      const [req, ctx] = makeRequest("user@test.com");
      const res = await GET(req, ctx);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        resolved_id: "user@test.com",
        first_seen: expect.any(String),
        last_seen: expect.any(String),
        identity_cluster: expect.objectContaining({
          user_ids: expect.any(Array),
          device_ids: expect.any(Array),
        }),
        events: expect.any(Array),
      });
    });

    it("passes the id to getUserProfile", async () => {
      const [req, ctx] = makeRequest("user@test.com");
      await GET(req, ctx);

      expect(mockGetUserProfile).toHaveBeenCalledWith("user@test.com");
    });
  });

  describe("not found — 404", () => {
    it("returns 404 with error when user not found", async () => {
      mockGetUserProfile.mockResolvedValue(null);

      const [req, ctx] = makeRequest("nonexistent@test.com");
      const res = await GET(req, ctx);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    });
  });

  describe("error handling — 500", () => {
    it("returns 500 when getUserProfile throws", async () => {
      mockGetUserProfile.mockRejectedValue(
        new Error("ClickHouse connection failed"),
      );

      const [req, ctx] = makeRequest("user@test.com");
      const res = await GET(req, ctx);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });
});
