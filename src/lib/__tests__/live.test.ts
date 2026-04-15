import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("@/lib/clickhouse", () => ({
  clickhouse: { query: mockQuery },
}));

import { queryNewEvents } from "@/lib/live";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockQueryReturns(rows: unknown[]) {
  mockQuery.mockResolvedValue({ json: vi.fn().mockResolvedValue(rows) });
}

const sampleEvents = [
  {
    event_id: "evt-1",
    event_name: "Page Viewed",
    timestamp: "2026-04-15 12:00:00.000",
    device_id: "device-abc",
    user_id: null,
    properties: "{}",
    ingested_at: "2026-04-15 12:00:01.000",
    resolved_id: "device-abc",
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQueryReturns([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("queryNewEvents", () => {
  it("calls ClickHouse with SQL containing ingested_at > {since:String}", async () => {
    await queryNewEvents("2026-04-15 12:00:00.000");

    expect(mockQuery).toHaveBeenCalledOnce();
    const { query } = mockQuery.mock.calls[0][0] as { query: string };
    expect(query).toContain("e.ingested_at > {since:String}");
  });

  it("queries with a LEFT JOIN on identity_mappings FINAL for resolved_id", async () => {
    await queryNewEvents("2026-04-15 12:00:00.000");

    const { query } = mockQuery.mock.calls[0][0] as { query: string };
    expect(query).toContain("identity_mappings FINAL");
    expect(query).toContain("coalesce(e.user_id, m.user_id, e.device_id)");
  });

  it("passes the sinceIngestedAt value as the since query_param", async () => {
    const since = "2026-04-15 11:00:00.000";
    await queryNewEvents(since);

    const { query_params } = mockQuery.mock.calls[0][0] as {
      query_params: Record<string, string>;
    };
    expect(query_params).toEqual(expect.objectContaining({ since }));
  });

  it("returns the parsed JSON rows from the ClickHouse result", async () => {
    mockQueryReturns(sampleEvents);

    const result = await queryNewEvents("2026-04-15 12:00:00.000");

    expect(result).toEqual(sampleEvents);
  });

  it("returns an empty array when no new events exist", async () => {
    mockQueryReturns([]);

    const result = await queryNewEvents("2026-04-15 12:00:00.000");

    expect(result).toEqual([]);
  });
});
