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

import { getUserProfile, searchUsers } from "@/lib/users";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockQueryReturns(rows: unknown[]) {
  mockQuery.mockResolvedValue({ json: vi.fn().mockResolvedValue(rows) });
}

const sampleUser = {
  resolved_id: "user@test.com",
  first_seen: "2026-04-01T00:00:00.000Z",
  last_seen: "2026-04-15T00:00:00.000Z",
  event_count: 42,
};

const sampleEvent = {
  event_id: "uuid-1",
  event_name: "Page Viewed",
  timestamp: "2026-04-15T10:00:00.000Z",
  device_id: "dev-1",
  user_id: null,
  properties: "{}",
  ingested_at: "2026-04-15T10:00:00.100Z",
  resolved_id: "user@test.com",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQueryReturns([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── searchUsers ──────────────────────────────────────────────────────────────

describe("searchUsers", () => {
  it("returns users list with resolved_id, first_seen, last_seen, event_count", async () => {
    mockQueryReturns([sampleUser]);

    const result = await searchUsers({});

    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toMatchObject({
      resolved_id: "user@test.com",
      first_seen: "2026-04-01T00:00:00.000Z",
      last_seen: "2026-04-15T00:00:00.000Z",
      event_count: 42,
    });
  });

  it("applies q filter (generates ILIKE condition in query)", async () => {
    mockQueryReturns([]);

    await searchUsers({ q: "john" });

    const callArgs = mockQuery.mock.calls[0][0];
    expect(callArgs.query).toContain("ILIKE");
    expect(callArgs.query_params.q).toBe("%john%");
  });

  it("respects limit parameter, caps at 200", async () => {
    mockQueryReturns([]);

    await searchUsers({ limit: 500 });

    const callArgs = mockQuery.mock.calls[0][0];
    expect(Number(callArgs.query_params.limit)).toBe(200);
  });

  it("applies cursor for pagination (generates condition in query)", async () => {
    mockQueryReturns([]);

    await searchUsers({ cursor: "user@abc.com" });

    const callArgs = mockQuery.mock.calls[0][0];
    expect(callArgs.query).toContain("{cursor:String}");
    expect(callArgs.query_params.cursor).toBe("user@abc.com");
  });

  it("returns next_cursor when result count equals limit", async () => {
    const rows = [
      { ...sampleUser, resolved_id: "a@test.com" },
      { ...sampleUser, resolved_id: "b@test.com" },
    ];
    mockQueryReturns(rows);

    const result = await searchUsers({ limit: 2 });

    expect(result.next_cursor).toBe("b@test.com");
  });

  it("returns null next_cursor when result count is less than limit", async () => {
    mockQueryReturns([sampleUser]);

    const result = await searchUsers({ limit: 10 });

    expect(result.next_cursor).toBeNull();
  });

  it("returns empty array when no results", async () => {
    mockQueryReturns([]);

    const result = await searchUsers({});

    expect(result.users).toEqual([]);
    expect(result.next_cursor).toBeNull();
  });
});

// ─── getUserProfile ────────────────────────────────────────────────────────────

describe("getUserProfile", () => {
  it("returns profile with resolved_id, first_seen, last_seen, identity_cluster, events", async () => {
    mockQuery
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue([
          {
            event_count: 5,
            first_seen: "2026-04-01T00:00:00.000Z",
            last_seen: "2026-04-15T00:00:00.000Z",
          },
        ]),
      })
      .mockResolvedValueOnce({
        json: vi
          .fn()
          .mockResolvedValue([
            { user_id: "user@test.com", device_id: "dev-1" },
          ]),
      })
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue([sampleEvent]),
      });

    const result = await getUserProfile("user@test.com");

    expect(result).not.toBeNull();
    expect(result?.resolved_id).toBe("user@test.com");
    expect(result?.first_seen).toBe("2026-04-01T00:00:00.000Z");
    expect(result?.last_seen).toBe("2026-04-15T00:00:00.000Z");
    expect(result?.identity_cluster).toBeDefined();
    expect(result?.events).toEqual([sampleEvent]);
  });

  it("identity_cluster includes all associated user_ids and device_ids", async () => {
    mockQuery
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue([
          {
            event_count: 3,
            first_seen: "2026-04-01T00:00:00.000Z",
            last_seen: "2026-04-15T00:00:00.000Z",
          },
        ]),
      })
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue([
          { user_id: "user@test.com", device_id: "dev-1" },
          { user_id: "user@test.com", device_id: "dev-2" },
          { user_id: null, device_id: "dev-3" },
        ]),
      })
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue([]),
      });

    const result = await getUserProfile("user@test.com");

    expect(result?.identity_cluster.user_ids).toEqual(["user@test.com"]);
    expect(result?.identity_cluster.device_ids).toHaveLength(3);
    expect(result?.identity_cluster.device_ids).toContain("dev-1");
    expect(result?.identity_cluster.device_ids).toContain("dev-2");
    expect(result?.identity_cluster.device_ids).toContain("dev-3");
  });

  it("returns null when resolved_id not found", async () => {
    // ClickHouse returns epoch for min(DateTime64) on empty set, not NULL.
    // We detect "not found" via event_count === 0.
    mockQuery.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue([
        {
          event_count: 0,
          first_seen: "1970-01-01 00:00:00.000",
          last_seen: "1970-01-01 00:00:00.000",
        },
      ]),
    });

    const result = await getUserProfile("nonexistent@test.com");

    expect(result).toBeNull();
  });
});
