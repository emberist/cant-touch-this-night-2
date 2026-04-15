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

import { buildTrendsQuery, queryTrends } from "@/lib/trends";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockQueryReturns(rows: unknown[]) {
  mockQuery.mockResolvedValue({ json: vi.fn().mockResolvedValue(rows) });
}

const baseParams = {
  event_name: "Page Viewed",
  measure: "count",
  granularity: "day" as const,
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

// ─── buildTrendsQuery ─────────────────────────────────────────────────────────

describe("buildTrendsQuery", () => {
  describe("measure expressions", () => {
    it("uses count() for measure=count", () => {
      const { query } = buildTrendsQuery({ ...baseParams, measure: "count" });
      expect(query).toContain("count()");
    });

    it("uses uniqExact and identity_mappings FINAL for measure=unique_users", () => {
      const { query } = buildTrendsQuery({
        ...baseParams,
        measure: "unique_users",
      });
      expect(query).toContain("uniqExact");
      expect(query).toContain("identity_mappings FINAL");
    });

    it("does not include identity_mappings JOIN for measure=count", () => {
      const { query } = buildTrendsQuery({ ...baseParams, measure: "count" });
      expect(query).not.toContain("identity_mappings");
    });

    it("uses sum(JSONExtractFloat) for measure=sum:amount", () => {
      const { query } = buildTrendsQuery({
        ...baseParams,
        measure: "sum:amount",
      });
      expect(query).toContain("sum(JSONExtractFloat");
      expect(query).toContain("'amount'");
    });

    it("uses avg(JSONExtractFloat) for measure=avg:amount", () => {
      const { query } = buildTrendsQuery({
        ...baseParams,
        measure: "avg:amount",
      });
      expect(query).toContain("avg(JSONExtractFloat");
      expect(query).toContain("'amount'");
    });

    it("uses min(JSONExtractFloat) for measure=min:amount", () => {
      const { query } = buildTrendsQuery({
        ...baseParams,
        measure: "min:amount",
      });
      expect(query).toContain("min(JSONExtractFloat");
    });

    it("uses max(JSONExtractFloat) for measure=max:amount", () => {
      const { query } = buildTrendsQuery({
        ...baseParams,
        measure: "max:amount",
      });
      expect(query).toContain("max(JSONExtractFloat");
    });
  });

  describe("granularity", () => {
    it("groups by toDate for granularity=day", () => {
      const { query } = buildTrendsQuery({
        ...baseParams,
        granularity: "day",
      });
      expect(query).toContain("toDate(");
    });

    it("groups by toMonday for granularity=week", () => {
      const { query } = buildTrendsQuery({
        ...baseParams,
        granularity: "week",
      });
      expect(query).toContain("toMonday(");
    });
  });

  describe("date range", () => {
    it("includes start and end_exclusive in query params", () => {
      const { query_params } = buildTrendsQuery({
        ...baseParams,
        start: "2026-04-01",
        end: "2026-04-15",
      });
      expect(query_params).toHaveProperty("start");
      expect(query_params).toHaveProperty("end_exclusive");
      expect(query_params.start).toContain("2026-04-01");
      expect(query_params.end_exclusive).toContain("2026-04-16");
    });

    it("start param uses ClickHouse-compatible space-separated format (no T or Z)", () => {
      const { query_params } = buildTrendsQuery({
        ...baseParams,
        start: "2026-04-01",
      });
      expect(query_params.start).toBe("2026-04-01 00:00:00.000");
      expect(query_params.start).not.toContain("T");
      expect(query_params.start).not.toContain("Z");
    });

    it("end_exclusive param uses ClickHouse-compatible space-separated format (no T or Z)", () => {
      const { query_params } = buildTrendsQuery({
        ...baseParams,
        end: "2026-04-15",
      });
      expect(query_params.end_exclusive).toBe("2026-04-16 00:00:00.000");
      expect(query_params.end_exclusive).not.toContain("T");
      expect(query_params.end_exclusive).not.toContain("Z");
    });

    it("end_exclusive correctly handles month rollover (April 30 → May 1)", () => {
      const { query_params } = buildTrendsQuery({
        ...baseParams,
        end: "2026-04-30",
      });
      expect(query_params.end_exclusive).toBe("2026-05-01 00:00:00.000");
    });

    it("references start and end_exclusive params in the WHERE clause", () => {
      const { query } = buildTrendsQuery(baseParams);
      expect(query).toContain("{start:String}");
      expect(query).toContain("{end_exclusive:String}");
    });

    it("includes event_name in query params", () => {
      const { query_params } = buildTrendsQuery({
        ...baseParams,
        event_name: "Purchase Completed",
      });
      expect(query_params.event_name).toBe("Purchase Completed");
    });
  });

  describe("breakdown", () => {
    it("does not include breakdown_val column when no breakdown is given", () => {
      const { query } = buildTrendsQuery(baseParams);
      expect(query).not.toContain("breakdown_val");
    });

    it("includes JSONExtractString and breakdown_val when breakdown is provided", () => {
      const { query } = buildTrendsQuery({
        ...baseParams,
        breakdown: "country",
      });
      expect(query).toContain("JSONExtractString");
      expect(query).toContain("breakdown_val");
      expect(query).toContain("'country'");
    });

    it("groups by breakdown_val in addition to bucket when breakdown is provided", () => {
      const { query } = buildTrendsQuery({
        ...baseParams,
        breakdown: "country",
      });
      expect(query).toContain("GROUP BY bucket, breakdown_val");
    });
  });
});

// ─── queryTrends ──────────────────────────────────────────────────────────────

describe("queryTrends", () => {
  describe("without breakdown", () => {
    it("returns a single series with label = event_name", async () => {
      mockQueryReturns([
        { bucket: "2026-04-01", value: 5 },
        { bucket: "2026-04-02", value: 3 },
      ]);

      const result = await queryTrends({
        ...baseParams,
        event_name: "Page Viewed",
      });

      expect(result.series).toHaveLength(1);
      expect(result.series[0].label).toBe("Page Viewed");
    });

    it("maps rows to { date, value } data points", async () => {
      mockQueryReturns([
        { bucket: "2026-04-01", value: 5 },
        { bucket: "2026-04-02", value: 3 },
      ]);

      const result = await queryTrends(baseParams);

      expect(result.series[0].data).toEqual([
        { date: "2026-04-01", value: 5 },
        { date: "2026-04-02", value: 3 },
      ]);
    });

    it("coerces string values returned by ClickHouse to numbers", async () => {
      mockQueryReturns([{ bucket: "2026-04-01", value: "42" }]);

      const result = await queryTrends(baseParams);

      expect(result.series[0].data[0].value).toBe(42);
      expect(typeof result.series[0].data[0].value).toBe("number");
    });

    it("returns { series: [] } when ClickHouse returns no rows", async () => {
      mockQueryReturns([]);

      const result = await queryTrends(baseParams);

      expect(result.series).toEqual([]);
    });
  });

  describe("with breakdown", () => {
    it("returns one series per distinct breakdown value", async () => {
      mockQueryReturns([
        { bucket: "2026-04-01", breakdown_val: "US", value: 10 },
        { bucket: "2026-04-01", breakdown_val: "DE", value: 5 },
        { bucket: "2026-04-02", breakdown_val: "US", value: 8 },
      ]);

      const result = await queryTrends({
        ...baseParams,
        breakdown: "country",
      });

      const labels = result.series.map((s) => s.label);
      expect(labels).toContain("US");
      expect(labels).toContain("DE");
    });

    it("orders data points within each series chronologically", async () => {
      mockQueryReturns([
        { bucket: "2026-04-01", breakdown_val: "US", value: 10 },
        { bucket: "2026-04-02", breakdown_val: "US", value: 8 },
      ]);

      const result = await queryTrends({
        ...baseParams,
        breakdown: "country",
      });

      const usSeries = result.series.find((s) => s.label === "US");
      expect(usSeries?.data[0].date).toBe("2026-04-01");
      expect(usSeries?.data[1].date).toBe("2026-04-02");
    });

    it("respects breakdown_limit and groups remaining values as Other", async () => {
      mockQueryReturns([
        { bucket: "2026-04-01", breakdown_val: "US", value: 100 },
        { bucket: "2026-04-01", breakdown_val: "DE", value: 50 },
        { bucket: "2026-04-01", breakdown_val: "FR", value: 10 },
      ]);

      const result = await queryTrends({
        ...baseParams,
        breakdown: "country",
        breakdown_limit: 2,
      });

      expect(result.series).toHaveLength(3); // US, DE, Other
      const labels = result.series.map((s) => s.label);
      expect(labels).toContain("US");
      expect(labels).toContain("DE");
      expect(labels).toContain("Other");
      expect(labels).not.toContain("FR");
    });

    it("Other series aggregates values of non-top breakdown values by date", async () => {
      mockQueryReturns([
        { bucket: "2026-04-01", breakdown_val: "US", value: 100 },
        { bucket: "2026-04-01", breakdown_val: "FR", value: 10 },
        { bucket: "2026-04-01", breakdown_val: "JP", value: 7 },
      ]);

      const result = await queryTrends({
        ...baseParams,
        breakdown: "country",
        breakdown_limit: 1,
      });

      const otherSeries = result.series.find((s) => s.label === "Other");
      expect(otherSeries).toBeDefined();
      // FR (10) + JP (7) = 17
      expect(otherSeries?.data[0].value).toBe(17);
    });

    it("does not add Other series when all values are within the limit", async () => {
      mockQueryReturns([
        { bucket: "2026-04-01", breakdown_val: "US", value: 10 },
        { bucket: "2026-04-01", breakdown_val: "DE", value: 5 },
      ]);

      const result = await queryTrends({
        ...baseParams,
        breakdown: "country",
        breakdown_limit: 10,
      });

      const labels = result.series.map((s) => s.label);
      expect(labels).not.toContain("Other");
    });

    it("sorts series by total value descending (top values first)", async () => {
      mockQueryReturns([
        { bucket: "2026-04-01", breakdown_val: "DE", value: 50 },
        { bucket: "2026-04-01", breakdown_val: "US", value: 100 },
        { bucket: "2026-04-01", breakdown_val: "FR", value: 25 },
      ]);

      const result = await queryTrends({
        ...baseParams,
        breakdown: "country",
        breakdown_limit: 10,
      });

      expect(result.series[0].label).toBe("US");
      expect(result.series[1].label).toBe("DE");
      expect(result.series[2].label).toBe("FR");
    });
  });
});
