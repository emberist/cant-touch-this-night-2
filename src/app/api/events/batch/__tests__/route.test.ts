import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

// Hoist all mock refs AND the error class so they're available inside vi.mock factory
const { mockInsertEvent, MockIdentityConflictError } = vi.hoisted(() => {
  class HoistedConflictError extends Error {
    readonly status = 409 as const;
    constructor(msg = "Device conflict") {
      super(msg);
      this.name = "IdentityConflictError";
      Object.setPrototypeOf(this, HoistedConflictError.prototype);
    }
  }

  return {
    mockInsertEvent: vi.fn(),
    MockIdentityConflictError: HoistedConflictError,
  };
});

vi.mock("@/lib/identity", () => ({
  insertEvent: mockInsertEvent,
  IdentityConflictError: MockIdentityConflictError,
}));

import { POST } from "@/app/api/events/batch/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/events/batch", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeMalformedRequest(): Request {
  return new Request("http://localhost/api/events/batch", {
    method: "POST",
    body: "{ this is not valid json !!!",
    headers: { "Content-Type": "application/json" },
  });
}

function makeSampleRow(overrides: Record<string, unknown> = {}) {
  return {
    event_id: "uuid-1234",
    event_name: "Page Viewed",
    timestamp: "2026-04-15T10:00:00.000Z",
    device_id: "dev-1",
    user_id: null,
    properties: "{}",
    ingested_at: "2026-04-15T10:00:00.100Z",
    resolved_id: "dev-1",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockInsertEvent.mockResolvedValue(makeSampleRow());
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/events/batch", () => {
  describe("all events valid — 200", () => {
    it("returns { ok: N, errors: [] } for N valid events", async () => {
      mockInsertEvent
        .mockResolvedValueOnce(makeSampleRow({ event_id: "id-1" }))
        .mockResolvedValueOnce(makeSampleRow({ event_id: "id-2" }))
        .mockResolvedValueOnce(makeSampleRow({ event_id: "id-3" }));

      const res = await POST(
        makeRequest([
          { event_name: "Page Viewed", device_id: "dev-1" },
          { event_name: "Button Clicked", device_id: "dev-2" },
          { event_name: "Purchase Completed", user_id: "user@test.com" },
        ]),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ ok: 3, errors: [] });
    });

    it("calls insertEvent for each item in the array", async () => {
      const events = [
        { event_name: "Page Viewed", device_id: "dev-1" },
        { event_name: "Button Clicked", device_id: "dev-2" },
      ];

      await POST(makeRequest(events));

      expect(mockInsertEvent).toHaveBeenCalledTimes(2);
      expect(mockInsertEvent).toHaveBeenNthCalledWith(1, events[0]);
      expect(mockInsertEvent).toHaveBeenNthCalledWith(2, events[1]);
    });
  });

  describe("empty array — 200", () => {
    it("returns { ok: 0, errors: [] } for empty array", async () => {
      const res = await POST(makeRequest([]));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ ok: 0, errors: [] });
      expect(mockInsertEvent).not.toHaveBeenCalled();
    });
  });

  describe("mixed valid/invalid events — 200 with errors", () => {
    it("returns correct ok count and errors array for mixed batch", async () => {
      mockInsertEvent
        .mockResolvedValueOnce(makeSampleRow()) // index 0 — success
        .mockRejectedValueOnce(
          new Error("event_name is required and must be a non-empty string."),
        ) // index 1 — invalid
        .mockResolvedValueOnce(makeSampleRow({ event_id: "id-3" })); // index 2 — success

      const res = await POST(
        makeRequest([
          { event_name: "Page Viewed", device_id: "dev-1" },
          { device_id: "dev-2" }, // missing event_name
          { event_name: "Signup Completed", user_id: "user@test.com" },
        ]),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(2);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0]).toMatchObject({
        index: 1,
        error: "event_name is required and must be a non-empty string.",
      });
    });

    it("reports correct index for each error in a mixed batch", async () => {
      mockInsertEvent
        .mockRejectedValueOnce(new Error("error at index 0"))
        .mockResolvedValueOnce(makeSampleRow())
        .mockRejectedValueOnce(new Error("error at index 2"));

      const res = await POST(
        makeRequest([
          { device_id: "dev-1" }, // index 0 — invalid
          { event_name: "Page Viewed", device_id: "dev-2" }, // index 1 — success
          { event_name: "" }, // index 2 — invalid
        ]),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(1);
      expect(body.errors).toHaveLength(2);
      expect(body.errors[0]).toMatchObject({
        index: 0,
        error: "error at index 0",
      });
      expect(body.errors[1]).toMatchObject({
        index: 2,
        error: "error at index 2",
      });
    });
  });

  describe("identity conflict — 200 with conflict in errors", () => {
    it("puts conflicting event in errors with its message; other events still succeed", async () => {
      mockInsertEvent
        .mockResolvedValueOnce(makeSampleRow()) // index 0 — success
        .mockRejectedValueOnce(
          new MockIdentityConflictError("Device already mapped"),
        ) // index 1 — conflict
        .mockResolvedValueOnce(makeSampleRow({ event_id: "id-3" })); // index 2 — success

      const res = await POST(
        makeRequest([
          { event_name: "Page Viewed", device_id: "dev-1" },
          {
            event_name: "Signup Completed",
            device_id: "dev-conflict",
            user_id: "user2@test.com",
          },
          { event_name: "Purchase Completed", user_id: "user@test.com" },
        ]),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(2);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0]).toMatchObject({
        index: 1,
        error: "Device already mapped",
      });
    });
  });

  describe("invalid top-level body — 400", () => {
    it("returns 400 with error when body is a plain object (not array)", async () => {
      const res = await POST(
        makeRequest({ event_name: "Page Viewed", device_id: "dev-1" }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    });

    it("returns 400 with error when body is a string", async () => {
      const res = await POST(makeRequest("not-an-array"));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 with error when body is not valid JSON", async () => {
      const res = await POST(makeMalformedRequest());

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });
});
