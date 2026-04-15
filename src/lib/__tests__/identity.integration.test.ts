/**
 * Integration tests for identity resolution (BR-101).
 * Requires a running ClickHouse server at localhost:8123 (or CLICKHOUSE_URL).
 * Uses a dedicated `minipanel_test` database — never touches `minipanel`.
 *
 * Run with: pnpm test (requires ./clickhouse server -- --path=.clickhouse)
 */

import { createClient } from "@clickhouse/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  getEventsByResolvedId,
  IdentityConflictError,
  insertEvent,
  queryEventsWithResolvedId,
} from "@/lib/identity";

const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL ?? "http://localhost:8123";
const TEST_DB = "minipanel_test";

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

// Test-scoped client — always uses minipanel_test
const testClient = createClient({
  url: CLICKHOUSE_URL,
  database: TEST_DB,
  password: process.env.CLICKHOUSE_PASSWORD ?? "password",
});

describe.skipIf(!(await isClickHouseReachable()))(
  "identity integration — real ClickHouse (minipanel_test)",
  () => {
    beforeAll(async () => {
      // Create test database and tables (idempotent)
      const adminClient = createClient({
        url: CLICKHOUSE_URL,
        password: process.env.CLICKHOUSE_PASSWORD ?? "password",
      });

      await adminClient.command({
        query: `CREATE DATABASE IF NOT EXISTS ${TEST_DB}`,
      });

      await adminClient.command({
        query: `
          CREATE TABLE IF NOT EXISTS ${TEST_DB}.events
          (
            event_id    UUID                     DEFAULT generateUUIDv4(),
            event_name  LowCardinality(String),
            timestamp   DateTime64(3, 'UTC'),
            device_id   Nullable(String),
            user_id     Nullable(String),
            properties  String,
            ingested_at DateTime64(3, 'UTC')     DEFAULT now64()
          )
          ENGINE = MergeTree()
          ORDER BY (timestamp, event_id)
          PARTITION BY toYYYYMM(timestamp)
        `,
      });

      await adminClient.command({
        query: `
          CREATE TABLE IF NOT EXISTS ${TEST_DB}.identity_mappings
          (
            device_id  String,
            user_id    String,
            created_at DateTime64(3, 'UTC') DEFAULT now64()
          )
          ENGINE = ReplacingMergeTree(created_at)
          ORDER BY (device_id)
        `,
      });

      await adminClient.close();
    });

    afterAll(async () => {
      await testClient.close();
    });

    afterEach(async () => {
      // Truncate after every test to keep isolation
      await testClient.command({ query: "TRUNCATE TABLE events" });
      await testClient.command({ query: "TRUNCATE TABLE identity_mappings" });
    });

    // ── BR-101 Scenario 1 ─────────────────────────────────────────────────────
    it("BR-101 S1: anonymous event followed by identify event → all events attributed to user (retroactive merge)", async () => {
      // Anonymous event (device only)
      await insertEvent(
        { event_name: "Page Viewed", device_id: "dev-s1" },
        testClient,
      );

      // Identify event (links device to user)
      await insertEvent(
        {
          event_name: "Signup Completed",
          device_id: "dev-s1",
          user_id: "user-s1@test.com",
        },
        testClient,
      );

      // Query by user's resolved_id — should return BOTH events
      const events = await queryEventsWithResolvedId(
        { resolved_id: "user-s1@test.com", limit: 50 },
        testClient,
      );

      expect(events.length).toBe(2);
      expect(events.every((e) => e.resolved_id === "user-s1@test.com")).toBe(
        true,
      );
    });

    // ── BR-101 Scenario 2 ─────────────────────────────────────────────────────
    it("BR-101 S2: two devices linked to same user → events from both devices returned", async () => {
      await insertEvent(
        {
          event_name: "Page Viewed",
          device_id: "dev-s2a",
          user_id: "user-s2@test.com",
        },
        testClient,
      );

      await insertEvent(
        {
          event_name: "Button Clicked",
          device_id: "dev-s2b",
          user_id: "user-s2@test.com",
        },
        testClient,
      );

      const events = await getEventsByResolvedId(
        "user-s2@test.com",
        testClient,
      );

      expect(events.length).toBe(2);
      const deviceIds = events.map((e) => e.device_id);
      expect(deviceIds).toContain("dev-s2a");
      expect(deviceIds).toContain("dev-s2b");
    });

    // ── BR-101 Scenario 3 ─────────────────────────────────────────────────────
    it("BR-101 S3: device mapped to two different users → second mapping throws IdentityConflictError (409)", async () => {
      // First mapping
      await insertEvent(
        {
          event_name: "Signup Completed",
          device_id: "dev-s3",
          user_id: "user-s3a@test.com",
        },
        testClient,
      );

      // Second mapping to a different user — must reject
      await expect(
        insertEvent(
          {
            event_name: "Purchase Completed",
            device_id: "dev-s3",
            user_id: "user-s3b@test.com",
          },
          testClient,
        ),
      ).rejects.toThrow(IdentityConflictError);
    });

    it("BR-101 S3: IdentityConflictError has status 409", async () => {
      await insertEvent(
        {
          event_name: "Signup Completed",
          device_id: "dev-s3x",
          user_id: "user-s3x-a@test.com",
        },
        testClient,
      );

      try {
        await insertEvent(
          {
            event_name: "Page Viewed",
            device_id: "dev-s3x",
            user_id: "user-s3x-b@test.com",
          },
          testClient,
        );
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(IdentityConflictError);
        expect((err as IdentityConflictError).status).toBe(409);
      }
    });

    // ── BR-101 Scenario 4 ─────────────────────────────────────────────────────
    it("BR-101 S4: same device + same user sent twice → second call succeeds (idempotent)", async () => {
      await insertEvent(
        {
          event_name: "Signup Completed",
          device_id: "dev-s4",
          user_id: "user-s4@test.com",
        },
        testClient,
      );

      // Identical mapping — must not throw
      await expect(
        insertEvent(
          {
            event_name: "Page Viewed",
            device_id: "dev-s4",
            user_id: "user-s4@test.com",
          },
          testClient,
        ),
      ).resolves.not.toThrow();

      // Both events inserted
      const events = await getEventsByResolvedId(
        "user-s4@test.com",
        testClient,
      );
      expect(events.length).toBe(2);
    });
  },
);
