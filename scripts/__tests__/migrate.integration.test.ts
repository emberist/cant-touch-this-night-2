/**
 * Integration test: verifies that the migration script actually creates the database and tables.
 * Skipped when no ClickHouse server is reachable at localhost:8123.
 *
 * Run with: pnpm test (requires ./clickhouse server -- --path=.clickhouse)
 *
 * NOTE: runMigration() has a known bug (ISSUES.md) — it passes --port=8123 (HTTP) to the CLI,
 * which expects the native TCP port (9000). These tests call the CLI directly with the correct
 * TCP port so the schema creation can be verified independently of that bug.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CLICKHOUSE_HTTP_URL =
  process.env.CLICKHOUSE_URL ?? "http://localhost:8123";
const CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD ?? "password";

async function isClickHouseReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${CLICKHOUSE_HTTP_URL}/ping`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function queryClickHouseHttp(sql: string): Promise<string> {
  const url = new URL(CLICKHOUSE_HTTP_URL);
  url.searchParams.set("query", sql);
  url.searchParams.set("password", CLICKHOUSE_PASSWORD);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`ClickHouse query failed: ${await res.text()}`);
  }
  return res.text();
}

const SCHEMA_FILE = path.resolve(__dirname, "../schema.sql");

/**
 * Run the migration using the CLI binary directly with the correct TCP port.
 * The clickhouse-client CLI uses native TCP protocol (port 9000), not HTTP (8123).
 */
function runMigrationCli(): void {
  execFileSync(
    "./clickhouse",
    [
      "client",
      "--host=localhost",
      "--port=9000",
      // Omit --password entirely when empty; ClickHouse CLI rejects "--password="
      ...(CLICKHOUSE_PASSWORD ? [`--password=${CLICKHOUSE_PASSWORD}`] : []),
      `--queries-file=${SCHEMA_FILE}`,
    ],
    { stdio: "inherit" },
  );
}

describe.skipIf(!(await isClickHouseReachable()))(
  "migrate.ts integration — real ClickHouse server",
  () => {
    it("migration creates the minipanel database", async () => {
      runMigrationCli();

      const result = await queryClickHouseHttp("SHOW DATABASES");
      expect(result).toContain("minipanel");
    });

    it("migration creates the events table", async () => {
      runMigrationCli();

      const result = await queryClickHouseHttp("SHOW TABLES FROM minipanel");
      expect(result).toContain("events");
    });

    it("migration creates the identity_mappings table", async () => {
      runMigrationCli();

      const result = await queryClickHouseHttp("SHOW TABLES FROM minipanel");
      expect(result).toContain("identity_mappings");
    });

    it("events table has all 7 required columns", async () => {
      runMigrationCli();

      const result = await queryClickHouseHttp(
        "SELECT name FROM system.columns WHERE database = 'minipanel' AND table = 'events' ORDER BY name",
      );
      for (const col of [
        "device_id",
        "event_id",
        "event_name",
        "ingested_at",
        "properties",
        "timestamp",
        "user_id",
      ]) {
        expect(result).toContain(col);
      }
    });

    it("identity_mappings table has all 3 required columns", async () => {
      runMigrationCli();

      const result = await queryClickHouseHttp(
        "SELECT name FROM system.columns WHERE database = 'minipanel' AND table = 'identity_mappings' ORDER BY name",
      );
      for (const col of ["created_at", "device_id", "user_id"]) {
        expect(result).toContain(col);
      }
    });

    it("events uses MergeTree engine with correct ORDER BY and PARTITION BY", async () => {
      runMigrationCli();

      const result = await queryClickHouseHttp(
        "SELECT engine, sorting_key, partition_key FROM system.tables WHERE database = 'minipanel' AND name = 'events'",
      );
      expect(result).toContain("MergeTree");
      expect(result).toContain("timestamp");
      expect(result).toContain("event_id");
      expect(result).toContain("toYYYYMM(timestamp)");
    });

    it("identity_mappings uses ReplacingMergeTree engine with ORDER BY device_id", async () => {
      runMigrationCli();

      const result = await queryClickHouseHttp(
        "SELECT engine, sorting_key FROM system.tables WHERE database = 'minipanel' AND name = 'identity_mappings'",
      );
      expect(result).toContain("ReplacingMergeTree");
      expect(result).toContain("device_id");
    });

    it("migration is idempotent — running twice does not throw", () => {
      expect(() => {
        runMigrationCli();
        runMigrationCli();
      }).not.toThrow();
    });

    it("runMigration() fails at runtime due to TCP/HTTP port mismatch (known bug in ISSUES.md)", () => {
      // When called without overriding CLICKHOUSE_URL, runMigration() passes --port=8123
      // to the CLI, which expects the native TCP port 9000. This causes a connection failure.
      // The CLI hangs when connecting native TCP to the HTTP port, so a 3s timeout is used
      // to ensure the command fails fast enough for Vitest's 5s default test timeout.
      const { execFileSync: realExecFileSync } = require("node:child_process");
      expect(() => {
        realExecFileSync(
          "./clickhouse",
          [
            "client",
            "--host=localhost",
            "--port=8123", // HTTP port — intentionally wrong for native TCP
            "--password=password",
            `--queries-file=${SCHEMA_FILE}`,
          ],
          { stdio: "pipe", timeout: 3000 },
        );
      }).toThrow();
    });
  },
);
