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

import { POST } from "@/app/api/events/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/events", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeMalformedRequest(): Request {
  return new Request("http://localhost/api/events", {
    method: "POST",
    body: "{ this is not valid json !!!",
    headers: { "Content-Type": "application/json" },
  });
}

const sampleRow = {
  event_id: "uuid-1234",
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
  mockInsertEvent.mockResolvedValue(sampleRow);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/events", () => {
  describe("success — 201", () => {
    it("returns 201 with event_id, event_name, resolved_id for device_id-only event", async () => {
      const res = await POST(
        makeRequest({ event_name: "Page Viewed", device_id: "dev-1" }),
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toMatchObject({
        event_id: sampleRow.event_id,
        event_name: sampleRow.event_name,
        resolved_id: sampleRow.resolved_id,
      });
    });

    it("returns 201 for user_id-only event", async () => {
      const userRow = {
        ...sampleRow,
        device_id: null,
        user_id: "user@test.com",
        resolved_id: "user@test.com",
      };
      mockInsertEvent.mockResolvedValue(userRow);

      const res = await POST(
        makeRequest({
          event_name: "Purchase Completed",
          user_id: "user@test.com",
        }),
      );

      expect(res.status).toBe(201);
    });

    it("returns 201 for event with both device_id and user_id", async () => {
      const bothRow = {
        ...sampleRow,
        user_id: "user@test.com",
        resolved_id: "user@test.com",
      };
      mockInsertEvent.mockResolvedValue(bothRow);

      const res = await POST(
        makeRequest({
          event_name: "Signup Completed",
          device_id: "dev-1",
          user_id: "user@test.com",
        }),
      );

      expect(res.status).toBe(201);
    });

    it("preserves caller-provided timestamp in the returned row", async () => {
      const ts = "2026-01-15T10:30:00.000Z";
      const rowWithTs = { ...sampleRow, timestamp: ts };
      mockInsertEvent.mockResolvedValue(rowWithTs);

      const res = await POST(
        makeRequest({
          event_name: "Page Viewed",
          device_id: "dev-1",
          timestamp: ts,
        }),
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.timestamp).toBe(ts);
    });

    it("passes the parsed body to insertEvent", async () => {
      const input = { event_name: "Button Clicked", device_id: "dev-2" };
      await POST(makeRequest(input));

      expect(mockInsertEvent).toHaveBeenCalledWith(input);
    });
  });

  describe("validation errors — 400", () => {
    it("returns 400 with error when event_name is missing", async () => {
      mockInsertEvent.mockRejectedValue(
        new Error("event_name is required and must be a non-empty string."),
      );

      const res = await POST(makeRequest({ device_id: "dev-1" }));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    });

    it("returns 400 with error when both device_id and user_id are missing", async () => {
      mockInsertEvent.mockRejectedValue(
        new Error("At least one of device_id or user_id must be present."),
      );

      const res = await POST(makeRequest({ event_name: "Page Viewed" }));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("returns 400 when request body is not valid JSON", async () => {
      const res = await POST(makeMalformedRequest());

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });

  describe("identity conflict — 409", () => {
    it("returns 409 with error when IdentityConflictError is thrown", async () => {
      mockInsertEvent.mockRejectedValue(
        new MockIdentityConflictError("Device conflict"),
      );

      const res = await POST(
        makeRequest({
          event_name: "Signup Completed",
          device_id: "dev-1",
          user_id: "user@test.com",
        }),
      );

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    });
  });
});
