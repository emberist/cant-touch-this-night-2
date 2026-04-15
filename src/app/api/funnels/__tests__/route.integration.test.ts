/**
 * Integration tests for POST /api/funnels
 *
 * These tests require:
 *   - A running dev server at http://localhost:3000
 *   - A running ClickHouse instance at http://localhost:8123
 *
 * Run with:
 *   pnpm dev &    # starts ClickHouse + Next.js via concurrently
 *   pnpm test
 */

import { beforeAll, describe, expect, it } from "vitest";

const BASE_URL = "http://localhost:3000";
const ENDPOINT = `${BASE_URL}/api/funnels`;

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

function postFunnel(body: unknown): Promise<Response> {
  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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

describe("POST /api/funnels — integration", () => {
  // ── Validation at HTTP level ─────────────────────────────────────────────

  it("missing steps returns 400 with error", async () => {
    if (!serverAvailable) return;

    const res = await postFunnel({ start: "2026-03-15", end: "2026-04-15" });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  it("fewer than 2 steps returns 400 with error", async () => {
    if (!serverAvailable) return;

    const res = await postFunnel({
      steps: ["Page Viewed"],
      start: "2026-03-15",
      end: "2026-04-15",
    });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("more than 5 steps returns 400 with error", async () => {
    if (!serverAvailable) return;

    const res = await postFunnel({
      steps: ["A", "B", "C", "D", "E", "F"],
      start: "2026-03-15",
      end: "2026-04-15",
    });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("missing start returns 400 with error", async () => {
    if (!serverAvailable) return;

    const res = await postFunnel({
      steps: ["Page Viewed", "Signup Completed"],
      end: "2026-04-15",
    });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("missing end returns 400 with error", async () => {
    if (!serverAvailable) return;

    const res = await postFunnel({
      steps: ["Page Viewed", "Signup Completed"],
      start: "2026-03-15",
    });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  // ── Response shape with seeded data ──────────────────────────────────────

  it("valid 3-step funnel returns 200 with correct steps shape", async () => {
    if (!serverAvailable) return;

    // Seed data so there are events in the table
    const seedRes = await fetch(`${BASE_URL}/api/seed`, {
      method: "POST",
      signal: AbortSignal.timeout(40000),
    });
    expect(seedRes.status).toBe(200);

    const res = await postFunnel({
      steps: ["Page Viewed", "Signup Completed", "Purchase Completed"],
      start: "2026-03-15",
      end: "2026-04-15",
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("steps");
    expect(Array.isArray(body.steps)).toBe(true);
  });

  it("each step has name, users, conversion_from_prev, conversion_overall", async () => {
    if (!serverAvailable) return;

    const res = await postFunnel({
      steps: ["Page Viewed", "Signup Completed", "Purchase Completed"],
      start: "2026-03-15",
      end: "2026-04-15",
    });
    const body = await res.json();

    for (const step of body.steps) {
      expect(typeof step.name).toBe("string");
      expect(typeof step.users).toBe("number");
      // conversion_from_prev is null for step 1, number otherwise
      if (body.steps.indexOf(step) === 0) {
        expect(step.conversion_from_prev).toBeNull();
      } else {
        expect(typeof step.conversion_from_prev).toBe("number");
      }
      expect(typeof step.conversion_overall).toBe("number");
    }
  });

  it("step names in response match the requested steps order", async () => {
    if (!serverAvailable) return;

    const steps = ["Page Viewed", "Signup Completed", "Purchase Completed"];
    const res = await postFunnel({
      steps,
      start: "2026-03-15",
      end: "2026-04-15",
    });
    const body = await res.json();

    expect(body.steps.map((s: { name: string }) => s.name)).toEqual(steps);
  });

  it("step 1 conversion_overall is 1.0 and conversion_from_prev is null", async () => {
    if (!serverAvailable) return;

    const res = await postFunnel({
      steps: ["Page Viewed", "Signup Completed"],
      start: "2026-03-15",
      end: "2026-04-15",
    });
    const body = await res.json();

    const step1 = body.steps[0];
    expect(step1.conversion_overall).toBe(1);
    expect(step1.conversion_from_prev).toBeNull();
  });

  it("user counts are non-increasing across steps (funnel monotonicity)", async () => {
    if (!serverAvailable) return;

    const res = await postFunnel({
      steps: ["Page Viewed", "Signup Completed", "Purchase Completed"],
      start: "2026-03-15",
      end: "2026-04-15",
    });
    const body = await res.json();

    for (let i = 1; i < body.steps.length; i++) {
      expect(body.steps[i].users).toBeLessThanOrEqual(body.steps[i - 1].users);
    }
  });
});
