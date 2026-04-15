# F11 Sprint 2 — 2026-04-15

## Test files written

- `src/lib/__tests__/trends.test.ts` — added 3 new tests under `buildTrendsQuery > date range`:
  - "start param uses ClickHouse-compatible space-separated format (no T or Z)"
  - "end_exclusive param uses ClickHouse-compatible space-separated format (no T or Z)"
  - "end_exclusive correctly handles month rollover (April 30 → May 1)"

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| Test suite → `pnpm test` exits 0 with 0 failures | ✅ | 149 passed, 16 skipped |
| Linter → `pnpm lint` exits 0 | ✅ | 40 files checked, 0 errors |
| Type check → `pnpm typecheck` exits 0 | ✅ | No errors |
| Build → `pnpm build` exits 0 | ✅ | All routes compiled |
| `src/lib/trends.ts` exports `buildTrendsQuery` and `queryTrends` | ✅ | Both exported |
| `src/app/api/trends/route.ts` exports `GET` | ✅ | Line 34 |
| `src/lib/__tests__/trends.test.ts` contains breakdown test cases | ✅ | Lines 145–168 SQL; 222–329 grouping |
| `src/app/api/trends/__tests__/route.test.ts` contains breakdown param forwarding tests | ✅ | Lines 182–234 |
| HTTP check: `GET /api/trends?breakdown=page&breakdown_limit=3` returns 200 with multiple series | ✅ (fixed) | Root cause: timestamp format bug fixed |

## Files created / modified

- `src/lib/trends.ts` — two fixes:
  1. `computeEndExclusive` now formats the result as `YYYY-MM-DD 00:00:00.000` (space-separated, no `T`/`Z`) instead of calling `.toISOString()`. Month rollover is still handled correctly via `Date.UTC`.
  2. `start` query param changed from `` `${start}T00:00:00.000Z` `` to `` `${start} 00:00:00.000` ``.
- `src/lib/__tests__/trends.test.ts` — added 3 unit tests verifying the ClickHouse-compatible timestamp format.
- `src/app/api/trends/__tests__/route.integration.test.ts` — auto-formatted by Biome (pre-existing long lines; no logic changes).

## Known gaps

None. All sprint contract criteria pass, including the previously failing HTTP check.

## Issues logged

None.
