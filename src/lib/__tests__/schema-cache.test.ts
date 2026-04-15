import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getCachedSchema,
  invalidateSchemaCache,
  setCachedSchema,
} from "@/lib/schema-cache";

const sampleSchema = {
  event_names: ["Page Viewed", "Purchase Completed"],
  properties: {
    "Purchase Completed": {
      amount: "numeric" as const,
      currency: "string" as const,
    },
  },
};

beforeEach(() => {
  vi.useFakeTimers();
  invalidateSchemaCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("schema cache", () => {
  it("returns null when cache is empty (never set)", () => {
    expect(getCachedSchema()).toBeNull();
  });

  it("returns the cached value within the TTL window", () => {
    setCachedSchema(sampleSchema);

    // Advance by 59 seconds — still within 60-second TTL
    vi.advanceTimersByTime(59_000);

    expect(getCachedSchema()).toEqual(sampleSchema);
  });

  it("returns null after TTL expires", () => {
    setCachedSchema(sampleSchema);

    // Advance by exactly 60 seconds — TTL expired
    vi.advanceTimersByTime(60_000);

    expect(getCachedSchema()).toBeNull();
  });

  it("returns null after TTL expires (well past expiry)", () => {
    setCachedSchema(sampleSchema);

    // Advance well past TTL
    vi.advanceTimersByTime(120_000);

    expect(getCachedSchema()).toBeNull();
  });

  it("returns null after manual invalidation", () => {
    setCachedSchema(sampleSchema);
    invalidateSchemaCache();

    expect(getCachedSchema()).toBeNull();
  });

  it("returns freshly set value after invalidation and re-set", () => {
    setCachedSchema(sampleSchema);
    invalidateSchemaCache();

    const newSchema = {
      event_names: ["Button Clicked"],
      properties: {},
    };
    setCachedSchema(newSchema);

    expect(getCachedSchema()).toEqual(newSchema);
  });

  it("returns the last set value when set multiple times", () => {
    setCachedSchema(sampleSchema);

    const updated = {
      event_names: ["Page Viewed"],
      properties: {},
    };
    setCachedSchema(updated);

    expect(getCachedSchema()).toEqual(updated);
  });
});
