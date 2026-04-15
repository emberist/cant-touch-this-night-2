import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const { mockQueryEventsWithResolvedId } = vi.hoisted(() => ({
  mockQueryEventsWithResolvedId: vi.fn(),
}));

vi.mock("@/lib/identity", () => ({
  queryEventsWithResolvedId: mockQueryEventsWithResolvedId,
}));

import { GET } from "@/app/api/events/list/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost/api/events/list");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

const sampleEvent = {
  event_id: "uuid-1",
  event_name: "Page Viewed",
  timestamp: "2026-04-15T10:00:00.000Z",
  device_id: "dev-1",
  user_id: null,
  properties: "{}",
  ingested_at: "2026-04-15T10:00:00.100Z",
  resolved_id: "dev-1",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQueryEventsWithResolvedId.mockResolvedValue([sampleEvent]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/events/list", () => {
  describe("success — 200", () => {
    it("returns 200 with events array and next_cursor fields", async () => {
      const res = await GET(makeRequest());

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("events");
      expect(body).toHaveProperty("next_cursor");
      expect(Array.isArray(body.events)).toBe(true);
    });

    it("returns empty events array and null cursor when no events match", async () => {
      mockQueryEventsWithResolvedId.mockResolvedValue([]);

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.events).toEqual([]);
      expect(body.next_cursor).toBeNull();
    });

    it("returns null next_cursor when fewer events than limit are returned (no more pages)", async () => {
      // default limit is 50; we return only 1 event — fewer than limit
      mockQueryEventsWithResolvedId.mockResolvedValue([sampleEvent]);

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.next_cursor).toBeNull();
    });

    it("returns last event timestamp as next_cursor when result count equals limit", async () => {
      const events = [
        {
          ...sampleEvent,
          timestamp: "2026-04-15T10:00:00.000Z",
          event_id: "uuid-1",
        },
        {
          ...sampleEvent,
          timestamp: "2026-04-14T09:00:00.000Z",
          event_id: "uuid-2",
        },
      ];
      mockQueryEventsWithResolvedId.mockResolvedValue(events);

      // limit=2 → results.length (2) === limit (2) → return last timestamp
      const res = await GET(makeRequest({ limit: "2" }));
      const body = await res.json();

      expect(body.next_cursor).toBe("2026-04-14T09:00:00.000Z");
    });

    it("includes the returned events in the response body", async () => {
      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.events).toEqual([sampleEvent]);
    });
  });

  describe("query param forwarding", () => {
    it("passes event_name query param to queryEventsWithResolvedId", async () => {
      await GET(makeRequest({ event_name: "Purchase Completed" }));

      expect(mockQueryEventsWithResolvedId).toHaveBeenCalledWith(
        expect.objectContaining({ event_name: "Purchase Completed" }),
      );
    });

    it("passes resolved_id query param to queryEventsWithResolvedId", async () => {
      await GET(makeRequest({ resolved_id: "user@test.com" }));

      expect(mockQueryEventsWithResolvedId).toHaveBeenCalledWith(
        expect.objectContaining({ resolved_id: "user@test.com" }),
      );
    });

    it("passes before cursor query param to queryEventsWithResolvedId", async () => {
      const before = "2026-04-14T11:59:59.000Z";
      await GET(makeRequest({ before }));

      expect(mockQueryEventsWithResolvedId).toHaveBeenCalledWith(
        expect.objectContaining({ before }),
      );
    });

    it("uses default limit of 50 when limit param is not specified", async () => {
      await GET(makeRequest());

      expect(mockQueryEventsWithResolvedId).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
      );
    });

    it("respects custom limit param", async () => {
      await GET(makeRequest({ limit: "100" }));

      expect(mockQueryEventsWithResolvedId).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }),
      );
    });

    it("clamps limit to max 200", async () => {
      await GET(makeRequest({ limit: "500" }));

      expect(mockQueryEventsWithResolvedId).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 200 }),
      );
    });
  });

  describe("invalid limit — 400", () => {
    it("returns 400 with error for non-numeric limit", async () => {
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
      const res = await GET(makeRequest({ limit: "-1" }));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });
});
