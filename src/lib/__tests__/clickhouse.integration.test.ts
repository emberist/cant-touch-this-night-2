/**
 * Integration test: verifies actual ClickHouse connectivity.
 * Skipped when no ClickHouse server is reachable at localhost:8123.
 *
 * Run with: pnpm test (requires ./clickhouse server -- --path=.clickhouse)
 */
import { describe, expect, it } from "vitest";

const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL ?? "http://localhost:8123";

async function isClickHouseReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${CLICKHOUSE_URL}/ping`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

describe.skipIf(!(await isClickHouseReachable()))(
  "clickhouse integration — real server",
  () => {
    it("client can execute SELECT 1 against a live ClickHouse server", async () => {
      const { clickhouse } = await import("@/lib/clickhouse");
      const result = await clickhouse.query({
        query: "SELECT 1 AS value",
        format: "JSONEachRow",
      });
      const rows = await result.json<{ value: number }>();
      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBe(1);
    });

    it("client ping returns a successful response", async () => {
      const { clickhouse } = await import("@/lib/clickhouse");
      const ping = await clickhouse.ping();
      expect(ping.success).toBe(true);
    });
  },
);
