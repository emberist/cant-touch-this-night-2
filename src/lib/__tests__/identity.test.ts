import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoist mock refs so vi.mock factory can reference them
const { mockQuery, mockInsert } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/clickhouse", () => ({
  clickhouse: {
    query: mockQuery,
    insert: mockInsert,
  },
}));

import {
  IdentityConflictError,
  insertEvent,
  resolveIdentityMapping,
  validateEvent,
} from "@/lib/identity";

// Helper: set up mockQuery to return a given rows array
function mockQueryReturns(rows: unknown[]) {
  mockQuery.mockResolvedValue({ json: vi.fn().mockResolvedValue(rows) });
}

beforeEach(() => {
  // Default: no existing identity mapping, inserts succeed
  mockQueryReturns([]);
  mockInsert.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── validateEvent ────────────────────────────────────────────────────────────

describe("validateEvent", () => {
  it("rejects when both device_id and user_id are missing", () => {
    expect(() => validateEvent({ event_name: "Page Viewed" })).toThrow();
  });

  it("rejects when event_name is missing", () => {
    expect(() => validateEvent({ device_id: "dev-1" })).toThrow();
  });

  it("rejects when event_name is empty string", () => {
    expect(() =>
      validateEvent({ event_name: "", device_id: "dev-1" }),
    ).toThrow();
  });

  it("rejects when event_name is whitespace only", () => {
    expect(() =>
      validateEvent({ event_name: "  ", device_id: "dev-1" }),
    ).toThrow();
  });

  it("accepts event with only device_id", () => {
    expect(() =>
      validateEvent({ event_name: "Page Viewed", device_id: "dev-1" }),
    ).not.toThrow();
  });

  it("accepts event with only user_id", () => {
    expect(() =>
      validateEvent({ event_name: "Page Viewed", user_id: "user@test.com" }),
    ).not.toThrow();
  });

  it("accepts event with both device_id and user_id", () => {
    expect(() =>
      validateEvent({
        event_name: "Signup Completed",
        device_id: "dev-1",
        user_id: "user@test.com",
      }),
    ).not.toThrow();
  });
});

// ─── insertEvent ──────────────────────────────────────────────────────────────

describe("insertEvent", () => {
  it("defaults timestamp to current time when not provided", async () => {
    const before = Date.now();
    await insertEvent({ event_name: "Page Viewed", device_id: "dev-1" });
    const after = Date.now();

    const insertCall = mockInsert.mock.calls[0][0];
    // INSERT uses ClickHouse format ("YYYY-MM-DD HH:MM:SS.mmm"); re-add the T+Z
    // suffix to parse as UTC for comparison with Date.now() (always UTC).
    const chTs = insertCall.values[0].timestamp as string;
    const insertedTs = new Date(`${chTs.replace(" ", "T")}Z`).getTime();
    expect(insertedTs).toBeGreaterThanOrEqual(before);
    expect(insertedTs).toBeLessThanOrEqual(after);
  });

  it("preserves caller-provided timestamp", async () => {
    const ts = "2026-01-15T10:30:00.000Z";
    await insertEvent({
      event_name: "Page Viewed",
      device_id: "dev-1",
      timestamp: ts,
    });

    const insertCall = mockInsert.mock.calls[0][0];
    // insertEvent converts to ClickHouse format before inserting
    expect(insertCall.values[0].timestamp).toBe("2026-01-15 10:30:00.000");
  });

  it("inserts event into the events table", async () => {
    await insertEvent({
      event_name: "Purchase Completed",
      user_id: "user@test.com",
      properties: { amount: 49.99 },
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ table: "events" }),
    );
  });

  it("stores event_name correctly in the inserted row", async () => {
    await insertEvent({ event_name: "Button Clicked", device_id: "dev-2" });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.values[0].event_name).toBe("Button Clicked");
  });

  it("serialises properties as a JSON string", async () => {
    await insertEvent({
      event_name: "Page Viewed",
      device_id: "dev-1",
      properties: { page: "/home", count: 3 },
    });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.values[0].properties).toBe(
      JSON.stringify({ page: "/home", count: 3 }),
    );
  });

  it("defaults properties to '{}' when not provided", async () => {
    await insertEvent({ event_name: "Page Viewed", device_id: "dev-1" });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.values[0].properties).toBe("{}");
  });

  it("calls resolveIdentityMapping (queries mappings) when both device_id and user_id are present", async () => {
    await insertEvent({
      event_name: "Signup Completed",
      device_id: "dev-1",
      user_id: "user@test.com",
    });

    // resolveIdentityMapping does a SELECT on identity_mappings
    expect(mockQuery).toHaveBeenCalled();
  });

  it("does NOT call resolveIdentityMapping when only device_id is present", async () => {
    await insertEvent({ event_name: "Page Viewed", device_id: "dev-1" });

    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("does NOT call resolveIdentityMapping when only user_id is present", async () => {
    await insertEvent({
      event_name: "Purchase Completed",
      user_id: "user@test.com",
    });

    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns an EventRow with resolved_id set to user_id when user_id is present", async () => {
    const result = await insertEvent({
      event_name: "Purchase Completed",
      device_id: "dev-1",
      user_id: "user@test.com",
    });

    expect(result.resolved_id).toBe("user@test.com");
  });

  it("returns an EventRow with resolved_id set to device_id when only device_id is present", async () => {
    const result = await insertEvent({
      event_name: "Page Viewed",
      device_id: "dev-1",
    });

    expect(result.resolved_id).toBe("dev-1");
  });
});

// ─── resolveIdentityMapping ───────────────────────────────────────────────────

describe("resolveIdentityMapping", () => {
  it("inserts a new mapping when no existing mapping is found", async () => {
    mockQueryReturns([]); // no existing mapping

    await resolveIdentityMapping("dev-1", "user@test.com");

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        table: "identity_mappings",
        values: [{ device_id: "dev-1", user_id: "user@test.com" }],
      }),
    );
  });

  it("is a no-op when existing mapping has the same user_id", async () => {
    mockQueryReturns([{ user_id: "user@test.com" }]); // same user already mapped

    await resolveIdentityMapping("dev-1", "user@test.com");

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("throws IdentityConflictError when existing mapping has a different user_id", async () => {
    mockQueryReturns([{ user_id: "other@test.com" }]); // different user already mapped

    await expect(
      resolveIdentityMapping("dev-1", "user@test.com"),
    ).rejects.toThrow(IdentityConflictError);
  });

  it("IdentityConflictError has status 409", async () => {
    mockQueryReturns([{ user_id: "other@test.com" }]);

    try {
      await resolveIdentityMapping("dev-1", "user@test.com");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(IdentityConflictError);
      expect((err as IdentityConflictError).status).toBe(409);
    }
  });
});
