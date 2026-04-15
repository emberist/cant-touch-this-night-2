# F10 Sprint 1 — 2026-04-15

## Test files written

- `src/lib/__tests__/trends.test.ts` — covers `buildTrendsQuery` SQL content (all six measures, both granularities, date-range params, breakdown vs no-breakdown) and `queryTrends` response transformation (single series label, data point mapping, numeric coercion, empty result, breakdown grouping, breakdown_limit / Other series, sort order)
- `src/app/api/trends/__tests__/route.test.ts` — covers 200 success, 400 validation errors (missing event_name / start / end, invalid measure, invalid granularity), default values (measure=count, granularity=day, breakdown_limit=10), correct forwarding of all params to `queryTrends`, and all valid measure variants via `it.each`

## Sprint contract results

| Criterion                        | Result | Notes                              |
| -------------------------------- | ------ | ---------------------------------- |
| Test suite → 0 failures          | ✅     | 138 passing, 0 failing, 16 skipped |
| Linter → `pnpm lint` exits 0     | ✅     | "No fixes applied"                 |
| Type check → `pnpm typecheck` exits 0 | ✅ | No errors                         |
| Build → `pnpm build` exits 0     | ✅     | `/api/trends` listed as Dynamic route |
| `src/lib/trends.ts` exports `queryTrends` | ✅ |                               |
| `src/app/api/trends/route.ts` exports `GET` | ✅ |                             |
| `src/lib/__tests__/trends.test.ts` exists | ✅ |                              |
| `src/app/api/trends/__tests__/route.test.ts` exists | ✅ |                    |

## Files created / modified

- `src/lib/trends.ts` (created) — `TrendsParams`, `Series`, `SeriesPoint`, `TrendsResponse`, `TrendsQuerySpec` types; `buildTrendsQuery` builds SQL + query_params; `queryTrends` executes query and transforms rows into series (with breakdown_limit / Other grouping)
- `src/app/api/trends/route.ts` (created) — `GET` handler; validates required params (event_name, start, end); validates measure and granularity; defaults measure=count, granularity=day, breakdown_limit=10; calls `queryTrends`
- `src/lib/__tests__/trends.test.ts` (created) — unit tests for `buildTrendsQuery` and `queryTrends`
- `src/app/api/trends/__tests__/route.test.ts` (created) — unit tests for `GET /api/trends` route handler

## Known gaps

- **Integration gap**: Full HTTP check against a live dev server (GET `/api/trends?event_name=...&start=...&end=...`) was noted as an evaluator responsibility in the test plan and was not covered here.
- No end-to-end Playwright test for the Trends page (not in scope for this sprint).

## Issues logged

None — ISSUES.md not created. No SPEC ambiguities were encountered beyond the ones already documented in the plan (week granularity → `toMonday`, Other grouping via Node post-processing, end-inclusive semantics). Those decisions were made per the plan.
