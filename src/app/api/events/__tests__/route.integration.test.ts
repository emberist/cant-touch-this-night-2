/**
 * Integration tests for POST /api/events
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
const ENDPOINT = `${BASE_URL}/api/events`;

/** Returns true if the dev server is reachable. */
async function isServerAvailable(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, {
      method: "HEAD",
      signal: AbortSignal.timeout(2000),
    });
    // Any HTTP response (even 404/500) means the server is up
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

describe("POST /api/events — integration", () => {
  it("valid body {event_name, device_id} → 201 with event_id and event_name", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: "Page Viewed",
        device_id: "dev-1",
      }),
    });

    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body).toHaveProperty("event_id");
    expect(typeof body.event_id).toBe("string");
    expect(body.event_id.length).toBeGreaterThan(0);

    expect(body).toHaveProperty("event_name");
    expect(body.event_name).toBe("Page Viewed");
  });

  it("missing event_name {device_id only} → 400 with error field", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: "dev-1" }),
    });

    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("missing identifiers {event_name only} → 400 with error field", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_name: "X" }),
    });

    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });
});
