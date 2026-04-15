# F11 Eval Sprint 2 — 2026-04-15

## Tests written

- `src/app/api/trends/__tests__/route.integration.test.ts` — carried over from eval-1 sprint. Exists on disk, not modified. Covers: valid 200 response, series shape, 400 for missing params, invalid measure/granularity, and the breakdown integration check (`breakdown returns 200 with multiple series...` at line 181).

No new test files written in this sprint — all relevant criteria from the plan are already covered by the eval-1 file.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| Test suite → `pnpm test` exits 0 with 0 failures | 0 failures | 149 passed, 16 skipped (server not running → integration tests gracefully skip) | ✅ |
| Linter → `pnpm lint` exits 0 | exit 0 | exit 0 (40 files, no fixes applied) | ✅ |
| Type check → `pnpm typecheck` exits 0 | exit 0 | exit 0, no errors | ✅ |
| Build → `pnpm build` exits 0 | exit 0 | exit 0, all routes compiled | ✅ |
| `src/lib/trends.ts` exports `buildTrendsQuery` and `queryTrends` | both exported | both exported (lines 84, 150) | ✅ |
| `src/app/api/trends/route.ts` exports `GET` | exported | exported (line 34) | ✅ |
| `src/lib/__tests__/trends.test.ts` contains breakdown test cases | present | present (lines 145–168 SQL; 222–329 grouping; 3 new date-format tests at 130–156) | ✅ |
| `src/app/api/trends/__tests__/route.test.ts` contains breakdown param forwarding tests | present | present (lines 182–234) | ✅ |
| HTTP check: `GET /api/trends?breakdown=page&breakdown_limit=2` returns 200 with multiple series | 200, series array with >1 series | 200, 3 series (`/home`, `/pricing`, `Other`) with correct label/data shape | ✅ |

## Score: 9/10

## Verdict: APPROVED

## Notes

**Timestamp bug fixed.** The root cause from eval-1 (`DateTime64` rejecting ISO strings with `T`/`Z`) is resolved. Both `start` and `computeEndExclusive` now produce `YYYY-MM-DD HH:MM:SS.mmm` (space-separated, no `T`/`Z`). Three new unit tests in `trends.test.ts` (lines 130–156) pin the exact string format and verify month-rollover correctness.

**HTTP endpoint verified manually.** ClickHouse was started (`./clickhouse server -- --path=.clickhouse`), test rows inserted directly via CLI, and Next.js started with `CLICKHOUSE_PASSWORD=""`. The endpoint returned:
```json
{"series":[{"label":"/home","data":[...]},{"label":"/pricing","data":[...]},{"label":"Other","data":[...]}]}
```
Breakdown and breakdown_limit work correctly: top-N series by total value, remainder in "Other".

**Integration test requires `/api/seed` (not yet implemented).** The test written in eval-1 (`breakdown returns 200 with multiple series`, line 181 of `route.integration.test.ts`) issues `POST /api/seed` before querying trends. The seed route (`/api/seed`) has not been implemented yet — it returns 404 — so this test cannot execute via the standard test harness when a dev server is running. When the server is absent, the test gracefully skips (the `isServerAvailable` guard). This is a test-infrastructure limitation, not an F11 code defect. Direct curl verification confirms the breakdown endpoint works correctly.

**Setup note (retained from eval-1).** The `pnpm migrate` script passes `--port=8123` (HTTP port) to the ClickHouse CLI; the CLI cannot connect there. Run migration directly: `./clickhouse client --port=9000 --queries-file=./scripts/schema.sql`. The ClickHouse local binary uses an empty password by default; set `CLICKHOUSE_PASSWORD=""` when running Next.js: `CLICKHOUSE_PASSWORD="" npx next dev`.
