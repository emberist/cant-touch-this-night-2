/**
 * Integration tests for POST /api/events/batch
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
const ENDPOINT = `${BASE_URL}/api/events/batch`;

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

describe("POST /api/events/batch — integration", () => {
  it("valid array of events → 200 with { ok: N, errors: [] }", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        { event_name: "Page Viewed", device_id: "batch-dev-1" },
        { event_name: "Button Clicked", device_id: "batch-dev-2" },
      ]),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("ok");
    expect(body).toHaveProperty("errors");
    expect(body.ok).toBe(2);
    expect(body.errors).toEqual([]);
  });

  it("empty array → 200 with { ok: 0, errors: [] }", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([]),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ ok: 0, errors: [] });
  });

  it("body is a plain object (not array) → 400 with error field", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_name: "Page Viewed", device_id: "dev-1" }),
    });

    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("body is not valid JSON → 400 with error field", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ this is not valid json !!!",
    });

    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("mixed batch: valid events succeed, invalid event (missing event_name) appears in errors", async () => {
    if (!serverAvailable) {
      console.log("[skip] Dev server not running — skipping integration test.");
      return;
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        { event_name: "Page Viewed", device_id: "batch-mix-dev-1" }, // valid
        { device_id: "batch-mix-dev-2" }, // missing event_name → error
        { event_name: "Signup Completed", user_id: "batch-mix-user@test.com" }, // valid
      ]),
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(2);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toMatchObject({ index: 1 });
    expect(typeof body.errors[0].error).toBe("string");
    expect(body.errors[0].error.length).toBeGreaterThan(0);
  });
});
