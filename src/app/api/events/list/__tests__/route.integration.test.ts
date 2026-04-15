/**
 * Integration tests for GET /api/events/list
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
const ENDPOINT = `${BASE_URL}/api/events/list`;

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

afterAll(() => {});

describe("GET /api/events/list — integration", () => {
  it("returns 200 with events array and next_cursor field", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const res = await fetch(ENDPOINT);

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("events");
    expect(body).toHaveProperty("next_cursor");
    expect(Array.isArray(body.events)).toBe(true);
  });

  it("accepts event_name query param without error", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const res = await fetch(`${ENDPOINT}?event_name=Page+Viewed`);

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("events");
    expect(body).toHaveProperty("next_cursor");
  });

  it("accepts before cursor param without error", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const res = await fetch(`${ENDPOINT}?before=2099-01-01T00:00:00.000Z`);

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("events");
    expect(body).toHaveProperty("next_cursor");
  });

  it("returns 400 for non-numeric limit", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const res = await fetch(`${ENDPOINT}?limit=abc`);

    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("accepts valid limit param without error", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const res = await fetch(`${ENDPOINT}?limit=10`);

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("events");
    expect(body).toHaveProperty("next_cursor");
    expect(body.events.length).toBeLessThanOrEqual(10);
  });
});
