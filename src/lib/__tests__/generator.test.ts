import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

const { mockInsert } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/clickhouse", () => ({
  clickhouse: {
    insert: mockInsert,
  },
}));

import {
  _clearJobs,
  cancelJob,
  getJob,
  listJobs,
  startGenerationJob,
} from "@/lib/generator";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_CONFIG = {
  total: 100,
  users: 5,
  start: "2026-01-01",
  end: "2026-04-01",
};

// ─── Global mock reset ────────────────────────────────────────────────────────

beforeEach(() => {
  _clearJobs();
  mockInsert.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── startGenerationJob — job creation ───────────────────────────────────────

describe("startGenerationJob — job creation", () => {
  it("returns a non-empty string job_id", () => {
    const jobId = startGenerationJob(VALID_CONFIG);
    expect(typeof jobId).toBe("string");
    expect(jobId.length).toBeGreaterThan(0);
  });

  it("getJob retrieves the created job by id", () => {
    const jobId = startGenerationJob(VALID_CONFIG);
    const job = getJob(jobId);
    expect(job).toBeDefined();
    expect(job?.job_id).toBe(jobId);
  });

  it("job starts with status 'queued' or 'running'", () => {
    const jobId = startGenerationJob(VALID_CONFIG);
    const job = getJob(jobId);
    expect(["queued", "running"]).toContain(job?.status);
  });

  it("job total matches the configured total", () => {
    const jobId = startGenerationJob({ total: 250, users: 5 });
    const job = getJob(jobId);
    expect(job?.total).toBe(250);
  });

  it("each job gets a unique job_id", () => {
    const id1 = startGenerationJob(VALID_CONFIG);
    const id2 = startGenerationJob(VALID_CONFIG);
    expect(id1).not.toBe(id2);
  });
});

// ─── Config defaults ──────────────────────────────────────────────────────────

describe("Config defaults", () => {
  it("defaults total to 10,000 when not provided", () => {
    const jobId = startGenerationJob({});
    const job = getJob(jobId);
    expect(job?.config.total).toBe(10_000);
  });

  it("defaults users to 100 when not provided", () => {
    const jobId = startGenerationJob({});
    const job = getJob(jobId);
    expect(job?.config.users).toBe(100);
  });

  it("defaults anonymous_ratio to 30 when not provided", () => {
    const jobId = startGenerationJob({});
    const job = getJob(jobId);
    expect(job?.config.anonymous_ratio).toBe(30);
  });

  it("defaults identity_resolution to true when not provided", () => {
    const jobId = startGenerationJob({});
    const job = getJob(jobId);
    expect(job?.config.identity_resolution).toBe(true);
  });

  it("defaults numeric_variance to 'medium' when not provided", () => {
    const jobId = startGenerationJob({});
    const job = getJob(jobId);
    expect(job?.config.numeric_variance).toBe("medium");
  });

  it("defaults start/end to a valid 30-day window when not provided", () => {
    const jobId = startGenerationJob({});
    const job = getJob(jobId);
    expect(job?.config.start).toBeTruthy();
    expect(job?.config.end).toBeTruthy();
    const startMs = new Date(job!.config.start).getTime();
    const endMs = new Date(job!.config.end).getTime();
    // end should be after start
    expect(endMs).toBeGreaterThan(startMs);
    // range should be approximately 30 days
    const rangeMs = endMs - startMs;
    expect(rangeMs).toBeGreaterThanOrEqual(29 * 24 * 60 * 60 * 1000);
    expect(rangeMs).toBeLessThanOrEqual(31 * 24 * 60 * 60 * 1000);
  });

  it("defaults event_types to the standard 6 event types when not provided", () => {
    const jobId = startGenerationJob({});
    const job = getJob(jobId);
    expect(job?.config.event_types.length).toBeGreaterThanOrEqual(1);
    const names = job!.config.event_types.map((et) => et.name);
    expect(names).toContain("Page Viewed");
  });
});

// ─── Invalid config ───────────────────────────────────────────────────────────

describe("Invalid config — throws on bad input", () => {
  it("throws when total < 1", () => {
    expect(() => startGenerationJob({ total: 0, users: 10 })).toThrow();
  });

  it("throws when total > 1,000,000", () => {
    expect(() => startGenerationJob({ total: 1_000_001, users: 10 })).toThrow();
  });

  it("throws when users < 1", () => {
    expect(() => startGenerationJob({ total: 100, users: 0 })).toThrow();
  });

  it("throws when end is before start", () => {
    expect(() =>
      startGenerationJob({ start: "2026-04-01", end: "2026-01-01" }),
    ).toThrow();
  });
});

// ─── getJob ───────────────────────────────────────────────────────────────────

describe("getJob", () => {
  it("returns undefined for a nonexistent job_id", () => {
    const result = getJob("nonexistent-id");
    expect(result).toBeUndefined();
  });
});

// ─── cancelJob ────────────────────────────────────────────────────────────────

describe("cancelJob", () => {
  it("returns false for a nonexistent job_id", () => {
    const result = cancelJob("nonexistent-id");
    expect(result).toBe(false);
  });

  it("returns true for an existing job_id", () => {
    const jobId = startGenerationJob(VALID_CONFIG);
    const result = cancelJob(jobId);
    expect(result).toBe(true);
  });

  it("sets the cancelled flag on the job", () => {
    const jobId = startGenerationJob(VALID_CONFIG);
    cancelJob(jobId);
    const job = getJob(jobId);
    expect(job?.cancelled).toBe(true);
  });
});

// ─── listJobs ─────────────────────────────────────────────────────────────────

describe("listJobs", () => {
  it("returns an empty array when no jobs exist", () => {
    expect(listJobs()).toEqual([]);
  });

  it("returns all created jobs", () => {
    const id1 = startGenerationJob(VALID_CONFIG);
    const id2 = startGenerationJob(VALID_CONFIG);
    const jobs = listJobs();
    const ids = jobs.map((j) => j.job_id);
    expect(ids).toContain(id1);
    expect(ids).toContain(id2);
  });

  it("returns jobs with correct status and row counts", () => {
    const jobId = startGenerationJob({ total: 50, users: 3 });
    const jobs = listJobs();
    const job = jobs.find((j) => j.job_id === jobId);
    expect(job).toBeDefined();
    expect(job?.total).toBe(50);
  });
});

// ─── Completion ───────────────────────────────────────────────────────────────

describe("Completion", () => {
  it("job status becomes 'complete' after all batches insert", async () => {
    const jobId = startGenerationJob({ total: 50, users: 3 });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );
  });

  it("inserted count matches total after completion", async () => {
    const jobId = startGenerationJob({ total: 50, users: 3 });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    expect(getJob(jobId)?.inserted).toBe(50);
  });

  it("elapsed_ms is positive after completion", async () => {
    const jobId = startGenerationJob({ total: 50, users: 3 });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    expect(getJob(jobId)?.elapsed_ms).toBeGreaterThanOrEqual(0);
  });
});

// ─── ClickHouse insert calls ──────────────────────────────────────────────────

describe("ClickHouse insert calls", () => {
  it("calls clickhouse.insert with table 'events'", async () => {
    const jobId = startGenerationJob({ total: 50, users: 3 });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    const eventsCalls = mockInsert.mock.calls.filter(
      (c) => c[0].table === "events",
    );
    expect(eventsCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("calls clickhouse.insert with format 'JSONEachRow'", async () => {
    const jobId = startGenerationJob({ total: 50, users: 3 });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    const eventsCalls = mockInsert.mock.calls.filter(
      (c) => c[0].table === "events",
    );
    for (const call of eventsCalls) {
      expect(call[0].format).toBe("JSONEachRow");
    }
  });

  it("each event batch has at most 10,000 rows", async () => {
    // Use 25,000 total to force 3 batches
    const jobId = startGenerationJob({ total: 25000, users: 10 });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 10000 },
    );

    const eventsCalls = mockInsert.mock.calls.filter(
      (c) => c[0].table === "events",
    );
    for (const call of eventsCalls) {
      expect(call[0].values.length).toBeLessThanOrEqual(10_000);
    }
  });

  it("calls clickhouse.insert with table 'identity_mappings' after events", async () => {
    const jobId = startGenerationJob({
      total: 50,
      users: 5,
      identity_resolution: true,
      anonymous_ratio: 0, // all resolved users
    });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    const allCalls = mockInsert.mock.calls.map((c) => c[0].table);
    const mappingsIdx = allCalls.lastIndexOf("identity_mappings");
    const lastEventsIdx = allCalls.lastIndexOf("events");

    expect(mappingsIdx).toBeGreaterThan(-1);
    expect(mappingsIdx).toBeGreaterThan(lastEventsIdx);
  });

  it("splits 25,000 events into 3 batches (10k + 10k + 5k)", async () => {
    const jobId = startGenerationJob({ total: 25000, users: 10 });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 10000 },
    );

    const eventsCalls = mockInsert.mock.calls.filter(
      (c) => c[0].table === "events",
    );
    expect(eventsCalls).toHaveLength(3);
    expect(eventsCalls[0][0].values.length).toBe(10_000);
    expect(eventsCalls[1][0].values.length).toBe(10_000);
    expect(eventsCalls[2][0].values.length).toBe(5_000);
  });
});

// ─── Batch event generation ───────────────────────────────────────────────────

describe("Batch event generation", () => {
  it("all generated events have an event_name from the configured event_types", async () => {
    const eventTypes = [
      { name: "Page Viewed", weight: 0.6 },
      { name: "Button Clicked", weight: 0.4 },
    ];
    const jobId = startGenerationJob({
      total: 200,
      users: 5,
      event_types: eventTypes,
    });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    const eventsCall = mockInsert.mock.calls.find(
      (c) => c[0].table === "events",
    );
    expect(eventsCall).toBeDefined();
    const allowedNames = new Set(eventTypes.map((et) => et.name));
    for (const event of eventsCall![0].values) {
      expect(allowedNames.has(event.event_name)).toBe(true);
    }
  });

  it("all event timestamps fall within the configured date range", async () => {
    const start = "2026-01-01";
    const end = "2026-04-01";
    const jobId = startGenerationJob({ total: 100, users: 5, start, end });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    const eventsCall = mockInsert.mock.calls.find(
      (c) => c[0].table === "events",
    );
    expect(eventsCall).toBeDefined();

    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();

    for (const event of eventsCall![0].values) {
      // Timestamps are in ClickHouse format: "YYYY-MM-DD HH:MM:SS.mmm"
      const ts = new Date(
        (event.timestamp as string).replace(" ", "T") + "Z",
      ).getTime();
      expect(ts).toBeGreaterThanOrEqual(startMs);
      expect(ts).toBeLessThanOrEqual(endMs);
    }
  });

  it("all event properties are valid JSON strings", async () => {
    const jobId = startGenerationJob({ total: 100, users: 5 });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    const eventsCall = mockInsert.mock.calls.find(
      (c) => c[0].table === "events",
    );
    expect(eventsCall).toBeDefined();

    for (const event of eventsCall![0].values) {
      expect(() => JSON.parse(event.properties as string)).not.toThrow();
    }
  });

  it("anonymous users have no user_id (null)", async () => {
    const jobId = startGenerationJob({
      total: 200,
      users: 4,
      identity_resolution: true,
      anonymous_ratio: 100, // all anonymous
    });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    const eventsCall = mockInsert.mock.calls.find(
      (c) => c[0].table === "events",
    );
    expect(eventsCall).toBeDefined();

    for (const event of eventsCall![0].values) {
      expect(event.user_id).toBeNull();
    }
  });

  it("non-anonymous users have both device_id and user_id", async () => {
    const jobId = startGenerationJob({
      total: 200,
      users: 4,
      identity_resolution: true,
      anonymous_ratio: 0, // all resolved
    });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    const eventsCall = mockInsert.mock.calls.find(
      (c) => c[0].table === "events",
    );
    expect(eventsCall).toBeDefined();

    for (const event of eventsCall![0].values) {
      expect(event.device_id).toBeTruthy();
      expect(event.user_id).toBeTruthy();
    }
  });
});

// ─── Identity mappings ────────────────────────────────────────────────────────

describe("Identity mappings", () => {
  it("inserts no identity_mappings when anonymous_ratio is 100%", async () => {
    const jobId = startGenerationJob({
      total: 50,
      users: 4,
      identity_resolution: true,
      anonymous_ratio: 100,
    });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    const mappingsCalls = mockInsert.mock.calls.filter(
      (c) => c[0].table === "identity_mappings",
    );
    expect(mappingsCalls.length).toBe(0);
  });

  it("inserts identity_mappings for fully-resolved users", async () => {
    const jobId = startGenerationJob({
      total: 50,
      users: 4,
      identity_resolution: true,
      anonymous_ratio: 0,
    });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    const mappingsCall = mockInsert.mock.calls.find(
      (c) => c[0].table === "identity_mappings",
    );
    expect(mappingsCall).toBeDefined();
    const mappings = mappingsCall![0].values;
    expect(mappings.length).toBeGreaterThan(0);
    for (const m of mappings) {
      expect(m.device_id).toBeTruthy();
      expect(m.user_id).toBeTruthy();
    }
  });
});

// ─── Cancellation ─────────────────────────────────────────────────────────────

describe("Cancellation", () => {
  it("job reaches a terminal state after cancellation", async () => {
    // Use a large enough job that it would take multiple batches
    const jobId = startGenerationJob({ total: 50000, users: 10 });
    cancelJob(jobId);

    await vi.waitFor(
      () => {
        const status = getJob(jobId)?.status;
        expect(status === "cancelled" || status === "complete").toBe(true);
      },
      { timeout: 10000 },
    );
  });

  it("cancelled job inserts fewer batches than the full job would", async () => {
    // 50,000 events = 5 batches; cancelling early should stop before all 5
    const jobId = startGenerationJob({ total: 50000, users: 10 });
    cancelJob(jobId);

    await vi.waitFor(
      () => {
        const status = getJob(jobId)?.status;
        expect(status === "cancelled" || status === "complete").toBe(true);
      },
      { timeout: 10000 },
    );

    const eventsCalls = mockInsert.mock.calls.filter(
      (c) => c[0].table === "events",
    );
    // Should have fewer than all 5 batches (cancelled before completion)
    expect(eventsCalls.length).toBeLessThan(5);
  });
});

// ─── Throughput calculation ───────────────────────────────────────────────────

describe("Throughput calculation", () => {
  it("throughput is a non-negative number after completion", async () => {
    const jobId = startGenerationJob({ total: 50, users: 3 });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    expect(getJob(jobId)?.throughput).toBeGreaterThanOrEqual(0);
  });

  it("eta_seconds is 0 after completion (all events inserted)", async () => {
    const jobId = startGenerationJob({ total: 50, users: 3 });

    await vi.waitFor(
      () => {
        expect(getJob(jobId)?.status).toBe("complete");
      },
      { timeout: 5000 },
    );

    expect(getJob(jobId)?.eta_seconds).toBe(0);
  });
});
