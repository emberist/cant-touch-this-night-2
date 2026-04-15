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

import { buildFunnelQuery, queryFunnel } from "@/lib/funnels";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockQueryReturns(rows: unknown[]) {
  mockQuery.mockResolvedValue({ json: vi.fn().mockResolvedValue(rows) });
}

const baseParams = {
  steps: ["Page Viewed", "Signup Completed", "Purchase Completed"],
  start: "2026-04-01",
  end: "2026-04-15",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQueryReturns([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── buildFunnelQuery ─────────────────────────────────────────────────────────

describe("buildFunnelQuery", () => {
  it("generates SQL containing windowFunnel aggregate function", () => {
    const { query } = buildFunnelQuery(baseParams);
    expect(query).toContain("windowFunnel");
  });

  it("includes identity_mappings FINAL JOIN for resolved identity", () => {
    const { query } = buildFunnelQuery(baseParams);
    expect(query).toContain("identity_mappings FINAL");
  });

  it("generates one step condition parameter per step", () => {
    const { query } = buildFunnelQuery(baseParams);
    expect(query).toContain("{step_0:String}");
    expect(query).toContain("{step_1:String}");
    expect(query).toContain("{step_2:String}");
  });

  it("correctly populates query_params with step names, start, and end_exclusive", () => {
    const { query_params } = buildFunnelQuery(baseParams);
    expect(query_params.step_0).toBe("Page Viewed");
    expect(query_params.step_1).toBe("Signup Completed");
    expect(query_params.step_2).toBe("Purchase Completed");
    expect(query_params).toHaveProperty("start");
    expect(query_params).toHaveProperty("end_exclusive");
  });

  it("works with 2 steps (minimum)", () => {
    const { query, query_params } = buildFunnelQuery({
      ...baseParams,
      steps: ["Page Viewed", "Signup Completed"],
    });
    expect(query).toContain("{step_0:String}");
    expect(query).toContain("{step_1:String}");
    expect(query).not.toContain("{step_2:String}");
    expect(query_params.step_0).toBe("Page Viewed");
    expect(query_params.step_1).toBe("Signup Completed");
  });

  it("works with 5 steps (maximum)", () => {
    const steps = ["A", "B", "C", "D", "E"];
    const { query, query_params } = buildFunnelQuery({ ...baseParams, steps });
    for (let i = 0; i < 5; i++) {
      expect(query).toContain(`{step_${i}:String}`);
      expect(query_params[`step_${i}`]).toBe(steps[i]);
    }
  });

  it("start param uses ClickHouse-compatible space-separated format (no T or Z)", () => {
    const { query_params } = buildFunnelQuery(baseParams);
    expect(query_params.start).toBe("2026-04-01 00:00:00.000");
    expect(query_params.start).not.toContain("T");
    expect(query_params.start).not.toContain("Z");
  });

  it("end_exclusive is computed correctly (day after end date)", () => {
    const { query_params } = buildFunnelQuery(baseParams);
    expect(query_params.end_exclusive).toBe("2026-04-16 00:00:00.000");
    expect(query_params.end_exclusive).not.toContain("T");
    expect(query_params.end_exclusive).not.toContain("Z");
  });

  it("end_exclusive correctly handles month rollover (April 30 → May 1)", () => {
    const { query_params } = buildFunnelQuery({
      ...baseParams,
      end: "2026-04-30",
    });
    expect(query_params.end_exclusive).toBe("2026-05-01 00:00:00.000");
  });

  it("filters events by date range in WHERE clause", () => {
    const { query } = buildFunnelQuery(baseParams);
    expect(query).toContain("{start:String}");
    expect(query).toContain("{end_exclusive:String}");
  });

  it("groups by resolved identity using coalesce", () => {
    const { query } = buildFunnelQuery(baseParams);
    expect(query).toContain("coalesce(e.user_id, m.user_id, e.device_id)");
  });
});

// ─── queryFunnel ──────────────────────────────────────────────────────────────

describe("queryFunnel", () => {
  it("returns correct step names in order from params", async () => {
    mockQueryReturns([
      { level: 1, cnt: 1000 },
      { level: 2, cnt: 320 },
      { level: 3, cnt: 88 },
    ]);

    const result = await queryFunnel(baseParams);
    expect(result.steps.map((s) => s.name)).toEqual([
      "Page Viewed",
      "Signup Completed",
      "Purchase Completed",
    ]);
  });

  it("computes cumulative user counts (level >= N for step N)", async () => {
    mockQueryReturns([
      { level: 1, cnt: 680 },
      { level: 2, cnt: 232 },
      { level: 3, cnt: 88 },
    ]);

    const result = await queryFunnel(baseParams);
    expect(result.steps[0].users).toBe(1000); // 680 + 232 + 88
    expect(result.steps[1].users).toBe(320); // 232 + 88
    expect(result.steps[2].users).toBe(88); // 88
  });

  it("conversion_from_prev is null for step 1", async () => {
    mockQueryReturns([{ level: 1, cnt: 1000 }]);

    const result = await queryFunnel({
      ...baseParams,
      steps: ["Page Viewed", "Signup Completed"],
    });
    expect(result.steps[0].conversion_from_prev).toBeNull();
  });

  it("conversion_from_prev is computed correctly for subsequent steps", async () => {
    mockQueryReturns([
      { level: 1, cnt: 680 },
      { level: 2, cnt: 232 },
      { level: 3, cnt: 88 },
    ]);

    const result = await queryFunnel(baseParams);
    // step 2 users / step 1 users = 320 / 1000 = 0.32
    expect(result.steps[1].conversion_from_prev).toBeCloseTo(0.32);
    // step 3 users / step 2 users = 88 / 320 = 0.275
    expect(result.steps[2].conversion_from_prev).toBeCloseTo(0.275);
  });

  it("conversion_overall for step 1 is 1.0", async () => {
    mockQueryReturns([{ level: 1, cnt: 1000 }]);

    const result = await queryFunnel({
      ...baseParams,
      steps: ["Page Viewed", "Signup Completed"],
    });
    expect(result.steps[0].conversion_overall).toBe(1.0);
  });

  it("conversion_overall is computed correctly", async () => {
    mockQueryReturns([
      { level: 1, cnt: 680 },
      { level: 2, cnt: 232 },
      { level: 3, cnt: 88 },
    ]);

    const result = await queryFunnel(baseParams);
    expect(result.steps[0].conversion_overall).toBe(1.0);
    // step 2 overall = 320 / 1000 = 0.32
    expect(result.steps[1].conversion_overall).toBeCloseTo(0.32);
    // step 3 overall = 88 / 1000 = 0.088
    expect(result.steps[2].conversion_overall).toBeCloseTo(0.088);
  });

  it("returns { steps: [] } when no rows are returned (empty funnel)", async () => {
    mockQueryReturns([]);

    const result = await queryFunnel(baseParams);
    expect(result).toEqual({ steps: [] });
  });

  it("handles a step with 0 users mid-funnel (avoids division by zero)", async () => {
    // Only level=1 rows: step 2 and step 3 have 0 users
    mockQueryReturns([{ level: 1, cnt: 1000 }]);

    const result = await queryFunnel(baseParams);
    expect(result.steps[1].users).toBe(0);
    expect(result.steps[2].users).toBe(0);
    // conversion_from_prev for step 3 = 0 / 0 → 0 (not NaN)
    expect(result.steps[2].conversion_from_prev).toBe(0);
  });

  it("coerces string values from ClickHouse to numbers", async () => {
    mockQueryReturns([
      { level: "1", cnt: "1000" },
      { level: "2", cnt: "320" },
    ]);

    const result = await queryFunnel(baseParams);
    expect(typeof result.steps[0].users).toBe("number");
    expect(result.steps[0].users).toBe(1320); // 1000 + 320
    expect(result.steps[1].users).toBe(320);
  });
});
