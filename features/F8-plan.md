# F8 Plan

## Acceptance criteria

From SPEC.md §6.3 — Schema / Autocomplete:

- `GET /api/schema` returns distinct event names and, per event, the detected property names with types.
- Response shape:
  ```json
  {
    "event_names": ["Page Viewed", "Purchase Completed"],
    "properties": {
      "Purchase Completed": {
        "amount": "numeric",
        "currency": "string",
        "plan": "string"
      }
    }
  }
  ```
- Computed by sampling the last 10,000 events.
- Cached in memory for 60 seconds.

From SPEC.md §4.5 — Numeric property detection:

- Numeric properties are detected at query time by attempting `JSONExtractFloat`.
- The `schema` API endpoint pre-scans a sample of recent events to return property names and inferred types, used to populate the UI dropdowns.

## Dependencies

Completed features this builds on:
- F1 (`features/F1-done.md`) — ClickHouse client singleton at `src/lib/clickhouse.ts`
- F2 (`features/F2-done.md`) — Migration script; `events` table exists in ClickHouse
- F5 (`features/F5-done.md`) — `POST /api/events` route for ingesting events (needed for integration testing)

Exact file paths that will be imported or extended:
- `src/lib/clickhouse.ts` — imported for the ClickHouse client singleton

## Files to create or modify

- CREATE `src/lib/schema-cache.ts` — in-memory cache with 60-second TTL
- CREATE `src/app/api/schema/route.ts` — GET handler for `/api/schema`
- CREATE `src/app/api/schema/__tests__/route.test.ts` — unit tests for the route
- CREATE `src/lib/__tests__/schema-cache.test.ts` — unit tests for the cache module

## Implementation order

1. **Create `src/lib/schema-cache.ts`** — generic time-based in-memory cache with configurable TTL. Exports a function to get/set cached schema data and a function to invalidate/clear the cache (for testing). The cache stores the schema response and a timestamp; returns the cached value if within TTL, otherwise returns `null`.

2. **Create `src/lib/__tests__/schema-cache.test.ts`** — unit tests for the schema cache: verifies cache hit within TTL, cache miss after TTL expiry, and manual invalidation.

3. **Create `src/app/api/schema/route.ts`** — GET handler that:
   - Checks the schema cache; returns cached response if fresh.
   - Otherwise queries ClickHouse for distinct event names (`SELECT DISTINCT event_name FROM events ORDER BY event_name`).
   - For each event name, samples up to 10,000 recent events and extracts property keys from the `properties` JSON column using `JSONExtractKeys`.
   - For each property key, attempts `JSONExtractFloat` on a sample to determine if the property is `"numeric"` or `"string"`.
   - Assembles the response, stores it in the cache, and returns it.

4. **Create `src/app/api/schema/__tests__/route.test.ts`** — unit tests for the route handler: verifies response shape, correct type inference, caching behavior, and empty-database edge case.

## Sprint contract

- [ ] File `src/lib/schema-cache.ts` exists and exports a cache mechanism (get/set/invalidate functions)
- [ ] File `src/app/api/schema/route.ts` exists and exports `GET`
- [ ] Test suite → `pnpm test` → 0 failures
- [ ] Lint check → `pnpm lint` → exit 0
- [ ] Type check → `pnpm typecheck` → exit 0
- [ ] Build check → `pnpm build` → exit 0
- [ ] HTTP check: GET `http://localhost:3000/api/schema` → response is JSON with `event_names` (array) and `properties` (object) keys

## Test plan

### Schema cache

- **Test file**: `src/lib/__tests__/schema-cache.test.ts`
- **Module under test**: `src/lib/schema-cache.ts`
- **Cases to cover**:
  - Returns `null` (cache miss) when cache is empty / never set
  - Returns cached value within TTL window
  - Returns `null` (cache miss) after TTL expires (use `vi.advanceTimersByTime` or inject a clock)
  - Manual invalidation clears the cache so next get returns `null`

### Schema route handler

- **Test file**: `src/app/api/schema/__tests__/route.test.ts`
- **Module under test**: `src/app/api/schema/route.ts` → `GET`
- **Cases to cover**:
  - Returns 200 with `{ event_names: [], properties: {} }` when database has no events (mock ClickHouse query to return empty results)
  - Returns correct `event_names` array from distinct event names query
  - Infers `"numeric"` type for properties where `JSONExtractFloat` succeeds (non-zero/non-null result from ClickHouse)
  - Infers `"string"` type for properties where `JSONExtractFloat` returns 0/null (non-numeric values)
  - Returns cached response on second call without re-querying ClickHouse (verify mock is called only once)
  - Response shape matches spec: top-level keys are `event_names` and `properties`

- **Integration gap**: HTTP check — GET `/api/schema` with seeded data returns populated event names and typed properties — requires dev server

## Risks and open questions

1. **`JSONExtractKeys` availability**: ClickHouse's `JSONExtractKeys` function extracts top-level keys from a JSON string. This is available in ClickHouse v22+. Since the spec mandates v26+ binary, this is safe.

2. **Numeric detection heuristic**: The spec says "attempting `JSONExtractFloat`". A property that contains mixed types across events (e.g., `"amount": 49.99` in some events and `"amount": "free"` in others) needs a decision rule. The plan uses a majority/sample approach: if `JSONExtractFloat` returns a non-zero/non-null value for at least one sampled row, the property is typed as `"numeric"`. This matches the spec's intent of enabling numeric aggregation dropdowns — a property that is sometimes numeric is still useful for `sum`/`avg`.

3. **Performance of per-event-name sampling**: If there are many distinct event names, running a separate sampling query per event could be slow. The implementation should use a single query that samples across all events (last 10,000 by `ingested_at` or `timestamp`), then groups property keys and types by `event_name` in application code.
