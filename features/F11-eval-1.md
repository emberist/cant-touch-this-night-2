# F11 Eval Sprint 1 — 2026-04-15

## Tests written

- `src/app/api/trends/__tests__/route.integration.test.ts` — appended one new test (`"breakdown returns 200 with multiple series..."`) covering the integration gap from the plan: `GET /api/trends?breakdown=page&breakdown_limit=3` with seeded data returns 200, multiple series, correct label/data shape, series count ≤ 4, totals sorted descending. This file existed from F10; existing tests were not changed.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| Test suite → `pnpm test` exits 0 with 0 failures | 0 failures | 0 failures (146 passed, 16 skipped) | ✅ |
| Linter → `pnpm lint` exits 0 | exit 0 | exit 0 (40 files, no fixes) | ✅ |
| Type check → `pnpm typecheck` exits 0 | exit 0 | exit 0 | ✅ |
| Build → `pnpm build` exits 0 | exit 0 | exit 0 | ✅ |
| `src/lib/trends.ts` exports `buildTrendsQuery` and `queryTrends` | both exported | both exported (lines 78, 144) | ✅ |
| `src/app/api/trends/route.ts` exports `GET` | exported | exported (line 34) | ✅ |
| `src/lib/__tests__/trends.test.ts` contains breakdown test cases | present | present (lines 145–168 SQL; 222–329 grouping) | ✅ |
| `src/app/api/trends/__tests__/route.test.ts` contains breakdown param forwarding tests | present | present (lines 182–234) | ✅ |
| HTTP check: `GET /api/trends?breakdown=page&breakdown_limit=3` returns 200 with multiple series | 200, series array | 500, ClickHouse type error | ❌ |

## Score: 5/10

## Verdict: NEEDS_WORK

## Feedback for next sprint

| Criterion | Error | File:Line | Action |
|-----------|-------|-----------|--------|
| HTTP check: `GET /api/trends?...` returns 200 | `Cannot convert string '2026-04-01T00:00:00.000Z' to type DateTime64(3, 'UTC')` | `src/lib/trends.ts:92` and `src/lib/trends.ts:44-47` | Fix timestamp format: change `start: \`${start}T00:00:00.000Z\`` to `start: \`${start} 00:00:00.000\`` (line 92). Fix `computeEndExclusive` to return ClickHouse-compatible format `YYYY-MM-DD HH:MM:SS.mmm` instead of calling `.toISOString()` (which produces `T`/`Z` format ClickHouse DateTime64 cannot parse). The fix: replace the `new Date(...).toISOString()` call with a manual string construction like `` `${y}-${String(m).padStart(2,'0')}-${String(d+1).padStart(2,'0')} 00:00:00.000` `` |

## Notes

- **Root cause**: ClickHouse `DateTime64(3, 'UTC')` does not accept ISO 8601 strings with `T` separator and `Z` suffix (e.g. `2026-04-01T00:00:00.000Z`). It requires space-separated format: `2026-04-01 00:00:00.000`. This affects ALL trends queries, not just breakdown — no trends query can execute against a real ClickHouse instance.

- **Why unit tests don't catch it**: `src/lib/__tests__/trends.test.ts` mocks the `@clickhouse/client` entirely. `buildTrendsQuery` is tested for SQL string content (e.g. `toContain("count()")`) but the timestamp values in `query_params` are never validated against a real ClickHouse parser. The mock accepts any format.

- **Infrastructure note**: The local ClickHouse single binary (v26) started via `./clickhouse server -- --path=.clickhouse` uses no password by default, but `src/lib/clickhouse.ts` defaults `password` to `"password"`. To run HTTP integration tests locally, set `CLICKHOUSE_PASSWORD=` (empty string) when starting Next.js: `CLICKHOUSE_PASSWORD="" npx next dev`. The `pnpm dev` script runs `predev` (migration) before ClickHouse starts, causing the migration to fail on first run — start ClickHouse separately, then run `pnpm migrate` with the CLI using `--port=9000` (not `--port=8123` as the migrate script uses), then start Next.js.

- **Scope**: F11 was fully delivered in F10 per the generator's claim — all static checks pass. The timestamp bug is a pre-existing defect in `buildTrendsQuery` that surfaces only when executing against a real ClickHouse instance, which no prior eval sprint has covered.
