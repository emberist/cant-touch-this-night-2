import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const { mockSeedData } = vi.hoisted(() => ({
  mockSeedData: vi.fn(),
}));

vi.mock("@/lib/seed", () => ({
  seedData: mockSeedData,
}));

import { POST } from "@/app/api/seed/route";

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSeedData.mockResolvedValue({ events: 12000, users: 60 });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/seed", () => {
  describe("success — 201", () => {
    it("returns 201 with ok:true, events, and users when seedData resolves", async () => {
      const res = await POST();

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toMatchObject({ ok: true, events: 12000, users: 60 });
    });

    it("propagates event and user counts from seedData result", async () => {
      mockSeedData.mockResolvedValue({ events: 11800, users: 60 });

      const res = await POST();

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.events).toBe(11800);
      expect(body.users).toBe(60);
    });
  });

  describe("failure — 500", () => {
    it("returns 500 with error message when seedData rejects with Error", async () => {
      mockSeedData.mockRejectedValue(new Error("ClickHouse unavailable"));

      const res = await POST();

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(body.error).toBe("ClickHouse unavailable");
    });

    it("returns 500 with generic message when seedData rejects with non-Error", async () => {
      mockSeedData.mockRejectedValue("something broke");

      const res = await POST();

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(body.error).toBe("Internal server error.");
    });
  });
});
