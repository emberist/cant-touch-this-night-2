import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const { mockQueryFunnel } = vi.hoisted(() => ({
  mockQueryFunnel: vi.fn(),
}));

vi.mock("@/lib/funnels", () => ({
  queryFunnel: mockQueryFunnel,
}));

import { POST } from "@/app/api/funnels/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/funnels", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeMalformedRequest(): Request {
  return new Request("http://localhost/api/funnels", {
    method: "POST",
    body: "{ this is not valid json !!!",
    headers: { "Content-Type": "application/json" },
  });
}

const sampleResponse = {
  steps: [
    {
      name: "Page Viewed",
      users: 1000,
      conversion_from_prev: null,
      conversion_overall: 1.0,
    },
    {
      name: "Signup Completed",
      users: 320,
      conversion_from_prev: 0.32,
      conversion_overall: 0.32,
    },
  ],
};

const validBody = {
  steps: ["Page Viewed", "Signup Completed"],
  start: "2026-04-01",
  end: "2026-04-15",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQueryFunnel.mockResolvedValue(sampleResponse);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/funnels", () => {
  describe("validation errors — 400", () => {
    it("returns 400 when body is not valid JSON", async () => {
      const res = await POST(makeMalformedRequest());

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when steps is missing", async () => {
      const res = await POST(
        makeRequest({ start: "2026-04-01", end: "2026-04-15" }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when steps has fewer than 2 entries", async () => {
      const res = await POST(
        makeRequest({
          steps: ["Page Viewed"],
          start: "2026-04-01",
          end: "2026-04-15",
        }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when steps has more than 5 entries", async () => {
      const res = await POST(
        makeRequest({
          steps: ["A", "B", "C", "D", "E", "F"],
          start: "2026-04-01",
          end: "2026-04-15",
        }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when steps contains non-string entries", async () => {
      const res = await POST(
        makeRequest({
          steps: ["Page Viewed", 42],
          start: "2026-04-01",
          end: "2026-04-15",
        }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when start is missing", async () => {
      const res = await POST(
        makeRequest({
          steps: ["Page Viewed", "Signup Completed"],
          end: "2026-04-15",
        }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when end is missing", async () => {
      const res = await POST(
        makeRequest({
          steps: ["Page Viewed", "Signup Completed"],
          start: "2026-04-01",
        }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });

  describe("success — 200", () => {
    it("returns 200 with steps array in response body", async () => {
      const res = await POST(makeRequest(validBody));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("steps");
      expect(Array.isArray(body.steps)).toBe(true);
    });

    it("forwards parsed params correctly to queryFunnel", async () => {
      await POST(makeRequest(validBody));

      expect(mockQueryFunnel).toHaveBeenCalledWith({
        steps: ["Page Viewed", "Signup Completed"],
        start: "2026-04-01",
        end: "2026-04-15",
      });
    });
  });

  describe("error handling — 500", () => {
    it("returns 500 when queryFunnel throws", async () => {
      mockQueryFunnel.mockRejectedValue(
        new Error("ClickHouse connection failed"),
      );

      const res = await POST(makeRequest(validBody));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });
});
