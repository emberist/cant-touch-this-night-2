/**
 * Integration tests for GET /api/trends
 *
 * These tests require:
 *   - A running dev server at http://localhost:3000
 *   - A running ClickHouse instance at http://localhost:8123
 *
 * Run with:
 *   pnpm dev &    # starts ClickHouse + Next.js via concurrently
 *   pnpm test
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const BASE_URL = "http://localhost:3000";
const ENDPOINT = `${BASE_URL}/api/trends`;

/** Returns true if the dev server is reachable. */
async function isServerAvailable(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, {
      method: "HEAD",
      signal: AbortSignal.timeout(2000),
    });
    return res.status < 600;
  } catch {
    return false;
  }
}

let serverAvailable = false;

beforeAll(async () => {
  serverAvailable = await isServerAvailable();
  if (!serverAvailable) {
    console.warn(
      "[integration] Dev server not available at http://localhost:3000 — skipping integration tests.",
    );
  }
});

afterAll(() => {
  // Nothing to tear down; we didn't start the server ourselves.
});

describe("GET /api/trends — integration", () => {
  it("valid request returns 200 with series array", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const url = new URL(ENDPOINT);
    url.searchParams.set("event_name", "Page Viewed");
    url.searchParams.set("start", "2026-01-01");
    url.searchParams.set("end", "2026-04-15");

    const res = await fetch(url.toString());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("series");
    expect(Array.isArray(body.series)).toBe(true);
  });

  it("series items have label string and data array of {date, value}", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const url = new URL(ENDPOINT);
    url.searchParams.set("event_name", "Page Viewed");
    url.searchParams.set("start", "2026-01-01");
    url.searchParams.set("end", "2026-04-15");

    const res = await fetch(url.toString());
    const body = await res.json();

    for (const series of body.series) {
      expect(typeof series.label).toBe("string");
      expect(Array.isArray(series.data)).toBe(true);
      for (const point of series.data) {
        expect(typeof point.date).toBe("string");
        expect(typeof point.value).toBe("number");
      }
    }
  });

  it("missing event_name returns 400 with error", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const url = new URL(ENDPOINT);
    url.searchParams.set("start", "2026-01-01");
    url.searchParams.set("end", "2026-04-15");

    const res = await fetch(url.toString());
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  it("missing start returns 400 with error", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const url = new URL(ENDPOINT);
    url.searchParams.set("event_name", "Page Viewed");
    url.searchParams.set("end", "2026-04-15");

    const res = await fetch(url.toString());
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("missing end returns 400 with error", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const url = new URL(ENDPOINT);
    url.searchParams.set("event_name", "Page Viewed");
    url.searchParams.set("start", "2026-01-01");

    const res = await fetch(url.toString());
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("invalid measure returns 400 with error", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const url = new URL(ENDPOINT);
    url.searchParams.set("event_name", "Page Viewed");
    url.searchParams.set("start", "2026-01-01");
    url.searchParams.set("end", "2026-04-15");
    url.searchParams.set("measure", "bogus");

    const res = await fetch(url.toString());
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("invalid granularity returns 400 with error", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const url = new URL(ENDPOINT);
    url.searchParams.set("event_name", "Page Viewed");
    url.searchParams.set("start", "2026-01-01");
    url.searchParams.set("end", "2026-04-15");
    url.searchParams.set("granularity", "month");

    const res = await fetch(url.toString());
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
