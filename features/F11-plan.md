# F11 Plan

## Acceptance criteria

From SPEC §6.4 — GET /api/trends, breakdown-specific params:

- `breakdown` (optional) — property name to break down by
- `breakdown_limit` (optional, default 10) — top N values; rest grouped as "Other"
- Without breakdown: returns a single series with label = event_name
- With breakdown: returns one series per distinct breakdown value (top N by total value), remaining values grouped into an "Other" series
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
- Breakdown uses `JSONExtractString(e.properties, '<breakdown>')` to extract the breakdown property value at query time
- Breakdown works with all measure types: count, unique_users, sum, avg, min, max
- Series are sorted by total value descending (highest first); "Other" appears last

## Dependencies

This feature was **already fully implemented as part of F10** (`features/F10-done.md`). The F10 sprint delivered breakdown and breakdown_limit support in both the SQL query builder and the route handler, along with comprehensive tests.

Completed features:
- F1 (`features/F1-done.md`) — ClickHouse client singleton → `src/lib/clickhouse.ts`
- F2 (`features/F2-done.md`) — Migration script / schema → `scripts/schema.sql`
- F4 (`features/F4-done.md`) — Identity resolution logic → `src/lib/identity.ts`
- F10 (`features/F10-done.md`) — GET /api/trends with count, unique_users, numeric aggregations, **breakdown, and breakdown_limit**

Files already implementing this feature:
- `src/lib/trends.ts` — `buildTrendsQuery()` generates breakdown SQL; `queryTrends()` groups rows into top-N series with "Other"
- `src/app/api/trends/route.ts` — Parses `breakdown` and `breakdown_limit` query params, forwards to `queryTrends()`
- `src/lib/__tests__/trends.test.ts` — Tests for breakdown SQL and series grouping logic
- `src/app/api/trends/__tests__/route.test.ts` — Tests for param forwarding and defaults

## Files to create or modify

No files need to be created or modified. The implementation is complete from F10.

Existing files that satisfy F11:
- `src/lib/trends.ts` (lines 78-126: `buildTrendsQuery` with breakdown SQL; lines 144-220: `queryTrends` with top-N + "Other" grouping)
- `src/app/api/trends/route.ts` (lines 42-43: breakdown param parsing; lines 75-81: breakdown_limit parsing)
- `src/lib/__tests__/trends.test.ts` (lines 145-168: breakdown SQL tests; lines 222-329: breakdown series grouping tests)
- `src/app/api/trends/__tests__/route.test.ts` (lines 182-194: breakdown_limit default; lines 198-234: param forwarding with breakdown)

## Implementation order

1. **Verify existing implementation** — All acceptance criteria are already satisfied by F10. No code changes required.

## Sprint contract

- [ ] Test suite → `pnpm test` exits 0 with 0 failures
- [ ] Linter → `pnpm lint` exits 0
- [ ] Type check → `pnpm typecheck` exits 0
- [ ] Build → `pnpm build` exits 0
- [ ] File `src/lib/trends.ts` exists and exports `buildTrendsQuery` and `queryTrends`
- [ ] File `src/app/api/trends/route.ts` exists and exports `GET`
- [ ] File `src/lib/__tests__/trends.test.ts` exists and contains breakdown test cases
- [ ] File `src/app/api/trends/__tests__/route.test.ts` exists and contains breakdown param forwarding tests

## Test plan

All tests already exist from F10. No additional tests needed.

### Existing coverage in `src/lib/__tests__/trends.test.ts`:

- **Module under test**: `buildTrendsQuery`, `queryTrends` from `src/lib/trends.ts`
- **Breakdown SQL cases**: no breakdown_val without breakdown; JSONExtractString + breakdown_val with breakdown; GROUP BY bucket, breakdown_val
- **Series grouping cases**: one series per distinct breakdown value; chronological ordering within series; breakdown_limit with "Other" aggregation; no "Other" when within limit; series sorted by total descending

### Existing coverage in `src/app/api/trends/__tests__/route.test.ts`:

- **Module under test**: `GET` from `src/app/api/trends/route.ts`
- **Cases covered**: defaults breakdown_limit to 10; forwards breakdown and breakdown_limit to queryTrends; passes breakdown as undefined when not provided

### Integration gap

- HTTP check: `GET /api/trends?event_name=Page+Viewed&start=2026-03-15&end=2026-04-15&breakdown=page&breakdown_limit=3` returns 200 with multiple series — requires dev server + seeded data

## Risks and open questions

1. **Feature already delivered in F10**: The F10 sprint plan explicitly included breakdown and breakdown_limit as acceptance criteria, and the approved implementation satisfies all F11 requirements. If the evaluator requires F11 to add net-new code, there is nothing additional to implement — the only option would be to split existing code into a separate commit, which would be artificial.
2. **SQL injection on breakdown property name**: The current implementation interpolates the breakdown property name directly into the SQL string (`'${breakdown}'`). This is acceptable for a self-hosted, no-auth local tool (per spec §1), but would need parameterization if the threat model changed.
