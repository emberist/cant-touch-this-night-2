/**
 * Unit tests for /api/generate/* route handlers.
 *
 * These tests import the route handlers directly and mock @/lib/generator.
 * No running server or ClickHouse instance required.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const { mockGetJob, mockCancelJob, mockListJobs } = vi.hoisted(() => ({
  mockGetJob: vi.fn(),
  mockCancelJob: vi.fn(),
  mockListJobs: vi.fn(),
}));

vi.mock("@/lib/generator", () => ({
  getJob: mockGetJob,
  cancelJob: mockCancelJob,
  listJobs: mockListJobs,
}));

import { POST as cancelPOST } from "@/app/api/generate/[job_id]/cancel/route";
import { GET as statusGET } from "@/app/api/generate/[job_id]/status/route";
import { GET as jobsGET } from "@/app/api/generate/jobs/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeParams(job_id: string): { params: Promise<{ job_id: string }> } {
  return { params: Promise.resolve({ job_id }) };
}

function makeRequest(url: string, method = "GET"): Request {
  return new Request(url, { method });
}

const COMPLETE_JOB = {
  job_id: "test-job-123",
  status: "complete" as const,
  inserted: 100,
  total: 100,
  throughput: 5000,
  eta_seconds: 0,
  elapsed_ms: 20,
  cancelled: false,
  created_at: Date.now(),
};

const RUNNING_JOB = {
  job_id: "running-job-456",
  status: "running" as const,
  inserted: 50,
  total: 100,
  throughput: 2500,
  eta_seconds: 1,
  elapsed_ms: 20,
  cancelled: false,
  created_at: Date.now(),
};

// ─── Global setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ─── GET /api/generate/[job_id]/status ────────────────────────────────────────

describe("GET /api/generate/[job_id]/status — unit", () => {
  it("unknown job_id → 404 with error field", async () => {
    mockGetJob.mockReturnValue(undefined);

    const res = await statusGET(
      makeRequest("http://localhost/api/generate/nonexistent/status"),
      makeParams("nonexistent"),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("known job_id → 200 with Content-Type: text/event-stream", async () => {
    mockGetJob.mockReturnValue(COMPLETE_JOB);

    const res = await statusGET(
      makeRequest("http://localhost/api/generate/test-job-123/status"),
      makeParams("test-job-123"),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");

    res.body?.cancel();
  });

  it("known job_id → Cache-Control: no-cache", async () => {
    mockGetJob.mockReturnValue(COMPLETE_JOB);

    const res = await statusGET(
      makeRequest("http://localhost/api/generate/test-job-123/status"),
      makeParams("test-job-123"),
    );

    expect(res.headers.get("Cache-Control")).toBe("no-cache");

    res.body?.cancel();
  });

  it("known job_id → Connection: keep-alive", async () => {
    mockGetJob.mockReturnValue(COMPLETE_JOB);

    const res = await statusGET(
      makeRequest("http://localhost/api/generate/test-job-123/status"),
      makeParams("test-job-123"),
    );

    expect(res.headers.get("Connection")).toBe("keep-alive");

    res.body?.cancel();
  });

  it("stream immediately enqueues SSE keep-alive comment", async () => {
    mockGetJob.mockReturnValue(COMPLETE_JOB);

    const res = await statusGET(
      makeRequest("http://localhost/api/generate/test-job-123/status"),
      makeParams("test-job-123"),
    );

    expect(res.body).not.toBeNull();
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();

    // Keep-alive comment is enqueued synchronously in start() before any timer fires
    const { value } = await reader.read();
    expect(decoder.decode(value)).toBe(":\n\n");

    reader.cancel();
  });

  it("stream emits data: line with JSON containing status/inserted/total for complete job", async () => {
    mockGetJob.mockReturnValue(COMPLETE_JOB);

    const res = await statusGET(
      makeRequest("http://localhost/api/generate/test-job-123/status"),
      makeParams("test-job-123"),
    );

    expect(res.body).not.toBeNull();
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();

    // Consume the keep-alive comment
    await reader.read();

    // Advance clock 500ms to trigger the setInterval
    await vi.advanceTimersByTimeAsync(600);

    const { value } = await reader.read();
    const text = decoder.decode(value);

    expect(text).toMatch(/^data: /);
    const json = JSON.parse(text.replace(/^data: /, "").trim());
    expect(json).toHaveProperty("status", "complete");
    expect(json).toHaveProperty("inserted", 100);
    expect(json).toHaveProperty("total", 100);
    expect(json).toHaveProperty("elapsed_ms");

    reader.cancel();
  });

  it("complete job payload includes elapsed_ms (not throughput/eta_seconds)", async () => {
    mockGetJob.mockReturnValue(COMPLETE_JOB);

    const res = await statusGET(
      makeRequest("http://localhost/api/generate/test-job-123/status"),
      makeParams("test-job-123"),
    );

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();

    // Skip keep-alive
    await reader.read();
    await vi.advanceTimersByTimeAsync(600);

    const { value } = await reader.read();
    const json = JSON.parse(
      decoder
        .decode(value)
        .replace(/^data: /, "")
        .trim(),
    );

    expect(json).toHaveProperty("elapsed_ms");
    expect(json).not.toHaveProperty("throughput");
    expect(json).not.toHaveProperty("eta_seconds");

    reader.cancel();
  });

  it("running job payload includes throughput/eta_seconds (not elapsed_ms)", async () => {
    // Return running status on first interval call, then complete on second (to close)
    mockGetJob
      .mockReturnValueOnce(RUNNING_JOB) // initial 404 check
      .mockReturnValueOnce(RUNNING_JOB) // interval call → running payload
      .mockReturnValue({ ...COMPLETE_JOB, job_id: "running-job-456" }); // close stream

    const res = await statusGET(
      makeRequest("http://localhost/api/generate/running-job-456/status"),
      makeParams("running-job-456"),
    );

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();

    // Skip keep-alive
    await reader.read();
    await vi.advanceTimersByTimeAsync(600);

    const { value } = await reader.read();
    const json = JSON.parse(
      decoder
        .decode(value)
        .replace(/^data: /, "")
        .trim(),
    );

    expect(json).toHaveProperty("status", "running");
    expect(json).toHaveProperty("throughput");
    expect(json).toHaveProperty("eta_seconds");
    expect(json).not.toHaveProperty("elapsed_ms");

    reader.cancel();
  });

  it("stream closes after terminal status (complete)", async () => {
    mockGetJob.mockReturnValue(COMPLETE_JOB);

    const res = await statusGET(
      makeRequest("http://localhost/api/generate/test-job-123/status"),
      makeParams("test-job-123"),
    );

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();

    // Skip keep-alive
    await reader.read();

    // Advance time to trigger interval (stream emits payload and closes)
    await vi.advanceTimersByTimeAsync(600);

    const { value } = await reader.read(); // data: line
    expect(decoder.decode(value)).toMatch(/data:/);

    // Stream should now be closed
    const { done } = await reader.read();
    expect(done).toBe(true);
  });
});

// ─── POST /api/generate/[job_id]/cancel ──────────────────────────────────────

describe("POST /api/generate/[job_id]/cancel — unit", () => {
  it("unknown job_id → 404 with error field", async () => {
    mockCancelJob.mockReturnValue(false);

    const res = await cancelPOST(
      makeRequest("http://localhost/api/generate/nonexistent/cancel", "POST"),
      makeParams("nonexistent"),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  it("known job_id → 200 with {cancelled: true}", async () => {
    mockCancelJob.mockReturnValue(true);

    const res = await cancelPOST(
      makeRequest("http://localhost/api/generate/test-job-123/cancel", "POST"),
      makeParams("test-job-123"),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ cancelled: true });
  });

  it("calls cancelJob with the correct job_id", async () => {
    mockCancelJob.mockReturnValue(true);

    await cancelPOST(
      makeRequest("http://localhost/api/generate/my-job-id/cancel", "POST"),
      makeParams("my-job-id"),
    );

    expect(mockCancelJob).toHaveBeenCalledWith("my-job-id");
  });
});

// ─── GET /api/generate/jobs ───────────────────────────────────────────────────

describe("GET /api/generate/jobs — unit", () => {
  it("returns 200 with JSON array", async () => {
    mockListJobs.mockReturnValue([]);

    const res = jobsGET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns empty array when no jobs exist", async () => {
    mockListJobs.mockReturnValue([]);

    const res = jobsGET();
    const body = await res.json();

    expect(body).toEqual([]);
  });

  it("returns jobs with job_id, status, inserted, and total fields", async () => {
    const jobs = [
      {
        job_id: "job-1",
        status: "complete",
        inserted: 100,
        total: 100,
        throughput: 5000,
        eta_seconds: 0,
        elapsed_ms: 20,
        cancelled: false,
        created_at: Date.now(),
      },
      {
        job_id: "job-2",
        status: "running",
        inserted: 50,
        total: 200,
        throughput: 2500,
        eta_seconds: 1,
        elapsed_ms: 20,
        cancelled: false,
        created_at: Date.now(),
      },
    ];
    mockListJobs.mockReturnValue(jobs);

    const res = jobsGET();
    const body = await res.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);

    for (const job of body) {
      expect(job).toHaveProperty("job_id");
      expect(job).toHaveProperty("status");
      expect(job).toHaveProperty("inserted");
      expect(job).toHaveProperty("total");
    }
  });

  it("calls listJobs to retrieve the job list", async () => {
    mockListJobs.mockReturnValue([]);

    jobsGET();

    expect(mockListJobs).toHaveBeenCalledOnce();
  });
});
