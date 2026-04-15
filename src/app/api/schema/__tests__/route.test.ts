import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock setup ────────────────────────────────────────────────────────────────

// Hoist mock refs so vi.mock factory can reference them
const { mockQuery, mockInvalidateSchemaCache } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockInvalidateSchemaCache: vi.fn(),
}));

vi.mock("@/lib/clickhouse", () => ({
  clickhouse: {
    query: mockQuery,
  },
}));

// We need to control the cache for these tests — invalidate before each test
vi.mock("@/lib/schema-cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/schema-cache")>();
  return {
    ...actual,
    invalidateSchemaCache: mockInvalidateSchemaCache.mockImplementation(
      actual.invalidateSchemaCache,
    ),
  };
});

import { GET } from "@/app/api/schema/route";
import { invalidateSchemaCache } from "@/lib/schema-cache";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(): Request {
  return new Request("http://localhost/api/schema");
}

/** Build a ClickHouse query mock that returns the given rows */
function mockQueryReturns(rows: unknown[]) {
  mockQuery.mockResolvedValue({ json: vi.fn().mockResolvedValue(rows) });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Clear the real schema cache before every test
  invalidateSchemaCache();
  vi.clearAllMocks();
  // Re-apply default: no rows
  mockQueryReturns([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/schema", () => {
  describe("response shape", () => {
    it("returns 200 with event_names array and properties object", async () => {
      mockQueryReturns([]);

      const res = await GET(makeRequest());

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("event_names");
      expect(body).toHaveProperty("properties");
      expect(Array.isArray(body.event_names)).toBe(true);
      expect(typeof body.properties).toBe("object");
    });

    it("returns empty event_names and properties when database has no events", async () => {
      mockQueryReturns([]);

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.event_names).toEqual([]);
      expect(body.properties).toEqual({});
    });
  });

  describe("event names", () => {
    it("returns distinct event names from ClickHouse results", async () => {
      mockQuery.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue([
          {
            event_name: "Page Viewed",
            property_key: "",
            is_numeric: 0,
          },
          {
            event_name: "Purchase Completed",
            property_key: "amount",
            is_numeric: 1,
          },
        ]),
      });

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.event_names).toContain("Page Viewed");
      expect(body.event_names).toContain("Purchase Completed");
    });
  });

  describe("property type inference", () => {
    it("infers 'numeric' type when is_numeric is truthy (1)", async () => {
      mockQuery.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue([
          {
            event_name: "Purchase Completed",
            property_key: "amount",
            is_numeric: 1,
          },
        ]),
      });

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.properties["Purchase Completed"].amount).toBe("numeric");
    });

    it("infers 'string' type when is_numeric is falsy (0)", async () => {
      mockQuery.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue([
          {
            event_name: "Purchase Completed",
            property_key: "currency",
            is_numeric: 0,
          },
        ]),
      });

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.properties["Purchase Completed"].currency).toBe("string");
    });

    it("handles mixed property types for the same event", async () => {
      mockQuery.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue([
          {
            event_name: "Purchase Completed",
            property_key: "amount",
            is_numeric: 1,
          },
          {
            event_name: "Purchase Completed",
            property_key: "currency",
            is_numeric: 0,
          },
          {
            event_name: "Purchase Completed",
            property_key: "plan",
            is_numeric: 0,
          },
        ]),
      });

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.properties["Purchase Completed"]).toEqual({
        amount: "numeric",
        currency: "string",
        plan: "string",
      });
    });
  });

  describe("caching", () => {
    it("returns cached response on second call without re-querying ClickHouse", async () => {
      mockQuery.mockResolvedValue({
        json: vi.fn().mockResolvedValue([]),
      });

      // First call — populates cache
      await GET(makeRequest());
      // Second call — should use cache
      await GET(makeRequest());

      // ClickHouse query should only have been called once
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("re-queries ClickHouse after cache is invalidated", async () => {
      mockQuery.mockResolvedValue({
        json: vi.fn().mockResolvedValue([]),
      });

      await GET(makeRequest());
      invalidateSchemaCache();
      await GET(makeRequest());

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe("events with no properties", () => {
    it("includes event in event_names but with empty properties object when property_key is empty", async () => {
      mockQuery.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue([
          {
            event_name: "Page Viewed",
            property_key: "",
            is_numeric: 0,
          },
        ]),
      });

      const res = await GET(makeRequest());
      const body = await res.json();

      expect(body.event_names).toContain("Page Viewed");
      // An empty property_key means no properties — should have empty object or no key
      // The implementation should omit empty property keys
      if ("Page Viewed" in body.properties) {
        expect(body.properties["Page Viewed"]).toEqual({});
      }
    });
  });
});
