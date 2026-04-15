# F10 Plan

## Acceptance criteria

From SPEC §6.4 — GET /api/trends:

- Route: `GET /api/trends`
- Query params:
  - `event_name` (required)
  - `measure` — `count` | `unique_users` | `sum:<property>` | `avg:<property>` | `min:<property>` | `max:<property>`
  - `granularity` — `day` | `week`
  - `start` — ISO date
  - `end` — ISO date
  - `breakdown` (optional) — property name to break down by
  - `breakdown_limit` (optional, default 10) — top N values; rest grouped as "Other"
- Response shape:
  ```json
  {
    "series": [
      {
        "label": "US",
        "data": [
          { "date": "2026-04-01", "value": 142 }
        ]
      }
    ]
  }
  ```
- Uses resolved identities for `unique_users` measure (joins events with identity_mappings FINAL, uses `coalesce(e.user_id, m.user_id, e.device_id)` as resolved_id)
- Numeric property aggregations (`sum`, `avg`, `min`, `max`) use `JSONExtractFloat` at query time
- Granularity `day` groups by date; `week` groups by week start
- Without breakdown: single series with label = event_name
- With breakdown: one series per breakdown value (top N by count), remaining grouped as "Other"

## Dependencies

Completed features this builds on:
- F1 (`features/F1-done.md`) — ClickHouse client singleton → `src/lib/clickhouse.ts`
- F2 (`features/F2-done.md`) — Migration script / schema → `scripts/schema.sql`
- F4 (`features/F4-done.md`) — Identity resolution logic → `src/lib/identity.ts` (join pattern with identity_mappings FINAL)

Files that will be imported:
- `src/lib/clickhouse.ts` — `clickhouse` client singleton

## Files to create or modify

- CREATE `src/lib/trends.ts` — core trends query builder and executor
- CREATE `src/app/api/trends/route.ts` — GET handler, param validation, calls trends logic
- CREATE `src/lib/__tests__/trends.test.ts` — unit tests for query building logic
- CREATE `src/app/api/trends/__tests__/route.test.ts` — unit tests for route handler

## Implementation order

1. **Create `src/lib/trends.ts`** — Define types (`TrendsParams`, `SeriesPoint`, `Series`, `TrendsResponse`). Implement `buildTrendsQuery(params)` that constructs the ClickHouse SQL string and query params based on the measure, granularity, date range, and optional breakdown. Implement `queryTrends(params, client?)` that executes the query and transforms the result rows into the response shape (grouping by breakdown label, filling date buckets, sorting series).

2. **Create `src/app/api/trends/route.ts`** — GET handler that:
   - Parses and validates query params (event_name required; measure defaults to `count`; granularity defaults to `day`; start/end required; breakdown and breakdown_limit optional with default 10).
   - Returns 400 for missing/invalid params.
   - Calls `queryTrends()` and returns 200 with the response.

3. **Create `src/lib/__tests__/trends.test.ts`** — Unit tests for the query builder and response transformation logic.

4. **Create `src/app/api/trends/__tests__/route.test.ts`** — Unit tests for the route handler (param validation, response shape, error cases).

## Sprint contract

- [ ] Test suite → `pnpm test` exits 0 with 0 failures
- [ ] Linter → `pnpm lint` exits 0
- [ ] Type check → `pnpm typecheck` exits 0
- [ ] Build → `pnpm build` exits 0
- [ ] File `src/lib/trends.ts` exists and exports `queryTrends`
- [ ] File `src/app/api/trends/route.ts` exists and exports `GET`
- [ ] File `src/lib/__tests__/trends.test.ts` exists
- [ ] File `src/app/api/trends/__tests__/route.test.ts` exists

## Test plan

### 1. Trends query builder — `src/lib/__tests__/trends.test.ts`

- **Module under test**: `src/lib/trends.ts` — `queryTrends` (with mocked ClickHouse client)
- **Cases to cover**:
  - **measure=count**: Calls ClickHouse with a query containing `count()`, returns correct series shape with `{ date, value }` entries.
  - **measure=unique_users**: Query uses `uniqExact(resolved_id)` (or `count(DISTINCT resolved_id)`), includes LEFT JOIN on identity_mappings FINAL.
  - **measure=sum:amount**: Query uses `sum(JSONExtractFloat(properties, 'amount'))`.
  - **measure=avg:amount**: Query uses `avg(JSONExtractFloat(properties, 'amount'))`.
  - **measure=min:amount / max:amount**: Query uses respective aggregate function with JSONExtractFloat.
  - **granularity=day**: Query groups by `toDate(e.timestamp)`.
  - **granularity=week**: Query groups by `toStartOfWeek(e.timestamp)` (or `toMonday`).
  - **date range filtering**: Query includes `WHERE e.timestamp >= start AND e.timestamp < end+1day`.
  - **Without breakdown**: Returns single series with label = event_name.
  - **With breakdown**: Query groups by `JSONExtractString(properties, breakdownProp)` in addition to date. Rows are transformed into multiple series, one per distinct breakdown value.
  - **breakdown_limit**: Only top N values are returned as individual series; remaining values are grouped into an "Other" series.
  - **Empty result set**: Returns `{ series: [] }` (or a single series with all-zero data points).

### 2. Route handler — `src/app/api/trends/__tests__/route.test.ts`

- **Module under test**: `src/app/api/trends/route.ts` — `GET`
- **Cases to cover**:
  - **Valid request**: Returns 200 with `{ series }` response shape.
  - **Missing event_name**: Returns 400 with `{ error }`.
  - **Missing start or end**: Returns 400 with `{ error }`.
  - **Invalid measure format** (e.g., `sum:` with no property, or `unknown`): Returns 400 with `{ error }`.
  - **Invalid granularity** (e.g., `month`): Returns 400 with `{ error }`.
  - **Default measure**: When measure param is omitted, defaults to `count`.
  - **Default granularity**: When granularity param is omitted, defaults to `day`.
  - **Default breakdown_limit**: When breakdown_limit param is omitted, defaults to 10.
  - **Query params forwarded correctly**: Verifies `queryTrends` is called with correctly parsed params.
  - **Integration gap**: Full HTTP check (GET `/api/trends?event_name=...&start=...&end=...`) — requires dev server.

## Risks and open questions

1. **Week granularity start day**: ClickHouse has both `toStartOfWeek` (Sunday-based) and `toMonday`. The spec says "week" without specifying. Will use `toMonday` (ISO 8601 convention). If a different start-of-week is needed, it can be made configurable later.
2. **"Other" aggregation for breakdowns**: Grouping remaining breakdown values into "Other" requires either a two-pass query (first find top N values, then query with CASE/IF) or a single query with window functions and post-processing. Will use post-processing in Node to keep the SQL simpler: query all breakdown values, sort by total, keep top N, merge the rest into "Other".
3. **Date range semantics**: The spec says `start` and `end` are ISO dates (not datetimes). The filter will use `e.timestamp >= toDateTime64(start, 3, 'UTC') AND e.timestamp < toDateTime64(end + 1 day, 3, 'UTC')` so that `end` is inclusive of the full day.
