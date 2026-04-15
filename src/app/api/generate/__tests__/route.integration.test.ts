/**
 * Integration tests for /api/generate/* routes.
 *
 * These tests require a running dev server at http://localhost:3000.
 * ClickHouse does NOT need to be running — the generate routes use
 * in-memory job state; the background insert loop fails silently if
 * ClickHouse is unavailable.
 *
 * Run with:
 *   next dev &   # start Next.js only (no ClickHouse needed)
 *   pnpm test
 */

import { describe, expect, it } from "vitest";

const BASE_URL = "http://localhost:3000";

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

const serverAvailable = await isServerAvailable();
if (!serverAvailable) {
  console.warn(
    "[integration] Dev server not available at http://localhost:3000 — skipping generate integration tests.",
  );
}

// ─── POST /api/generate/start ─────────────────────────────────────────────────

describe("POST /api/generate/start — integration", () => {
  it("valid config {total:100, users:10} → 201 with job_id string", async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${BASE_URL}/api/generate/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: 100, users: 10 }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("job_id");
    expect(typeof body.job_id).toBe("string");
    expect(body.job_id.length).toBeGreaterThan(0);
  });

  it("invalid config {total:0} → 400 with error field", async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${BASE_URL}/api/generate/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: 0, users: 10 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  it("invalid config {total:2000000} → 400 with error field", async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${BASE_URL}/api/generate/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: 2_000_000, users: 10 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("invalid JSON body → 400", async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${BASE_URL}/api/generate/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    expect(res.status).toBe(400);
  });
});

// ─── GET /api/generate/jobs ───────────────────────────────────────────────────

describe("GET /api/generate/jobs — integration", () => {
  it("returns a JSON array (possibly empty)", async () => {
    if (!serverAvailable) return;

    const res = await fetch(`${BASE_URL}/api/generate/jobs`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("after POST /api/generate/start, GET /api/generate/jobs includes the new job", async () => {
    if (!serverAvailable) return;

    const startRes = await fetch(`${BASE_URL}/api/generate/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: 50, users: 5 }),
    });
    expect(startRes.status).toBe(201);
    const { job_id } = await startRes.json();

    const jobsRes = await fetch(`${BASE_URL}/api/generate/jobs`);
    expect(jobsRes.status).toBe(200);
    const jobs = await jobsRes.json();
    expect(Array.isArray(jobs)).toBe(true);

    const found = jobs.find((j: { job_id: string }) => j.job_id === job_id);
    expect(found).toBeDefined();
    expect(found.total).toBe(50);
  });
});

// ─── POST /api/generate/[job_id]/cancel ──────────────────────────────────────

describe("POST /api/generate/[job_id]/cancel — integration", () => {
  it("cancelling an existing job → 200 with {cancelled: true}", async () => {
    if (!serverAvailable) return;

    const startRes = await fetch(`${BASE_URL}/api/generate/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: 1_000_000, users: 50 }),
    });
    expect(startRes.status).toBe(201);
    const { job_id } = await startRes.json();

    const cancelRes = await fetch(`${BASE_URL}/api/generate/${job_id}/cancel`, {
      method: "POST",
    });
    expect(cancelRes.status).toBe(200);
    const body = await cancelRes.json();
    expect(body).toEqual({ cancelled: true });
  });

  it("cancelling a non-existent job → 404", async () => {
    if (!serverAvailable) return;

    const res = await fetch(
      `${BASE_URL}/api/generate/nonexistent-job-id/cancel`,
      { method: "POST" },
    );
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/generate/[job_id]/status (SSE) ─────────────────────────────────

describe("GET /api/generate/[job_id]/status — integration", () => {
  it("non-existent job → 404", async () => {
    if (!serverAvailable) return;

    const res = await fetch(
      `${BASE_URL}/api/generate/nonexistent-job-id/status`,
    );
    expect(res.status).toBe(404);
  });

  it("existing job → 200 with Content-Type: text/event-stream", async () => {
    if (!serverAvailable) return;

    const startRes = await fetch(`${BASE_URL}/api/generate/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: 50, users: 5 }),
    });
    expect(startRes.status).toBe(201);
    const { job_id } = await startRes.json();

    const statusRes = await fetch(`${BASE_URL}/api/generate/${job_id}/status`, {
      signal: AbortSignal.timeout(5000),
    });
    expect(statusRes.status).toBe(200);
    expect(statusRes.headers.get("content-type")).toContain(
      "text/event-stream",
    );

    // Read at least one SSE data event
    const reader = statusRes.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let text = "";
    // Read chunks until we see a `data:` line or the stream closes
    for (let i = 0; i < 20; i++) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
      if (text.includes("data:")) break;
    }
    reader.cancel();
    expect(text).toMatch(/data:/);
  });
});
