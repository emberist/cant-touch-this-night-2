/**
 * Integration tests for searchUsers and getUserProfile (F13).
 * Requires a running ClickHouse server at localhost:8123 (or CLICKHOUSE_URL).
 * Uses a dedicated `minipanel_test` database — never touches `minipanel`.
 *
 * Run with: pnpm test (requires ./clickhouse server -- --path=.clickhouse)
 */

import { createClient } from "@clickhouse/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { getUserProfile, searchUsers } from "@/lib/users";

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

const testClient = createClient({
  url: CLICKHOUSE_URL,
  database: TEST_DB,
  password: process.env.CLICKHOUSE_PASSWORD ?? "password",
});

describe.skipIf(!(await isClickHouseReachable()))(
  "users integration — real ClickHouse (minipanel_test)",
  () => {
    beforeAll(async () => {
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
      await testClient.command({ query: "TRUNCATE TABLE events" });
      await testClient.command({ query: "TRUNCATE TABLE identity_mappings" });
    });

    // Helper: insert a minimal event row directly.
    // Converts ISO 8601 timestamps to ClickHouse DateTime64 format
    // ("YYYY-MM-DD HH:MM:SS.mmm") since ClickHouse JSONEachRow rejects the
    // "T" separator and "Z" suffix.
    async function insertRawEvent(
      eventName: string,
      userId: string | null,
      deviceId: string | null,
      ts = "2026-04-10T10:00:00.000Z",
    ) {
      await testClient.insert({
        table: "events",
        values: [
          {
            event_name: eventName,
            timestamp: ts.replace("T", " ").replace(/Z$/, ""),
            device_id: deviceId,
            user_id: userId,
            properties: "{}",
          },
        ],
        format: "JSONEachRow",
      });
    }

    // ─── searchUsers ──────────────────────────────────────────────────────────

    describe("searchUsers", () => {
      it("returns identified user from events", async () => {
        await insertRawEvent("Page Viewed", "u1@test.com", "dev-u1");

        const { users } = await searchUsers({}, testClient);

        const match = users.find((u) => u.resolved_id === "u1@test.com");
        expect(match).toBeDefined();
        expect(match?.event_count).toBeGreaterThanOrEqual(1);
        expect(match?.first_seen).toBeTruthy();
        expect(match?.last_seen).toBeTruthy();
      });

      it("filters users by q (substring match)", async () => {
        await insertRawEvent("Page Viewed", "alice@test.com", "dev-alice");
        await insertRawEvent("Page Viewed", "bob@test.com", "dev-bob");

        const { users } = await searchUsers({ q: "alice" }, testClient);

        expect(users.some((u) => u.resolved_id === "alice@test.com")).toBe(
          true,
        );
        expect(users.some((u) => u.resolved_id === "bob@test.com")).toBe(false);
      });

      it("returns empty array when q matches nothing", async () => {
        await insertRawEvent("Page Viewed", "charlie@test.com", "dev-charlie");

        const { users, next_cursor } = await searchUsers(
          { q: "nonexistent_xyz_qqa" },
          testClient,
        );

        expect(users).toEqual([]);
        expect(next_cursor).toBeNull();
      });

      it("cursor pagination: next page starts after cursor", async () => {
        // Insert 3 users with predictable resolved_ids sorted lexicographically
        await insertRawEvent("Page Viewed", "aa@test.com", "dev-aa");
        await insertRawEvent("Page Viewed", "bb@test.com", "dev-bb");
        await insertRawEvent("Page Viewed", "cc@test.com", "dev-cc");

        // Page 1: limit 2
        const page1 = await searchUsers({ limit: 2 }, testClient);
        expect(page1.users.length).toBe(2);
        expect(page1.next_cursor).toBeTruthy();

        // Page 2: provide cursor from page 1
        const cursor1 = page1.next_cursor ?? undefined;
        const page2 = await searchUsers(
          { limit: 2, cursor: cursor1 },
          testClient,
        );
        // Must not repeat any resolved_id from page 1
        const page1Ids = new Set(page1.users.map((u) => u.resolved_id));
        for (const u of page2.users) {
          expect(page1Ids.has(u.resolved_id)).toBe(false);
        }
      });

      it("uses resolved identity (device events attributed to mapped user)", async () => {
        // Insert anonymous event for device-anon
        await insertRawEvent("Page Viewed", null, "device-anon");
        // Map device-anon → user-mapped via identity_mappings
        await testClient.insert({
          table: "identity_mappings",
          values: [{ device_id: "device-anon", user_id: "mapped@test.com" }],
          format: "JSONEachRow",
        });
        // Optimize forces deduplication of ReplacingMergeTree
        await testClient.command({
          query: "OPTIMIZE TABLE identity_mappings FINAL",
        });

        const { users } = await searchUsers(
          { q: "mapped@test.com" },
          testClient,
        );

        expect(users.some((u) => u.resolved_id === "mapped@test.com")).toBe(
          true,
        );
      });
    });

    // ─── getUserProfile ────────────────────────────────────────────────────────

    describe("getUserProfile", () => {
      it("returns null when no events exist for resolved_id", async () => {
        const result = await getUserProfile("ghost@test.com", testClient);
        expect(result).toBeNull();
      });

      it("returns profile with correct fields when user exists", async () => {
        await insertRawEvent(
          "Page Viewed",
          "profiled@test.com",
          "dev-profiled",
          "2026-04-10T10:00:00.000Z",
        );
        await insertRawEvent(
          "Purchase Completed",
          "profiled@test.com",
          "dev-profiled",
          "2026-04-11T12:00:00.000Z",
        );

        const profile = await getUserProfile("profiled@test.com", testClient);

        expect(profile).not.toBeNull();
        expect(profile?.resolved_id).toBe("profiled@test.com");
        expect(profile?.first_seen).toBeTruthy();
        expect(profile?.last_seen).toBeTruthy();
        expect(profile?.identity_cluster).toBeDefined();
        expect(profile?.events.length).toBeGreaterThanOrEqual(2);
      });

      it("identity_cluster includes device_id associated with the user", async () => {
        await insertRawEvent("Page Viewed", "cluster@test.com", "dev-cluster");

        const profile = await getUserProfile("cluster@test.com", testClient);

        expect(profile?.identity_cluster.user_ids).toContain(
          "cluster@test.com",
        );
        expect(profile?.identity_cluster.device_ids).toContain("dev-cluster");
      });

      it("events are returned newest first", async () => {
        await insertRawEvent(
          "Page Viewed",
          "ordered@test.com",
          null,
          "2026-04-01T00:00:00.000Z",
        );
        await insertRawEvent(
          "Purchase Completed",
          "ordered@test.com",
          null,
          "2026-04-15T00:00:00.000Z",
        );

        const profile = await getUserProfile("ordered@test.com", testClient);

        expect(profile?.events.length).toBe(2);
        // First event in array should be the more recent one
        expect(profile?.events[0].event_name).toBe("Purchase Completed");
        expect(profile?.events[1].event_name).toBe("Page Viewed");
      });
    });
  },
);
