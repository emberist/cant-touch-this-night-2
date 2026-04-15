# F16 Sprint 1 — 2026-04-15

## Test files written

- `src/app/api/seed/__tests__/route.test.ts` — covers POST /api/seed: 201 success with `ok`, `events`, `users`; 500 on Error rejection; 500 with generic message on non-Error rejection
- `src/app/api/seed/status/__tests__/route.test.ts` — covers GET /api/seed/status: 200 with numeric `events` and `users`; string-to-number conversion; zero-count handling; 500 on ClickHouse Error; 500 with generic message on non-Error rejection

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| Test suite 0 failures | ✅ | 248 passing, 0 failing, 25 skipped |
| Linter → exit 0 | ✅ | 4 warnings (all pre-existing in seed.test.ts — `noExplicitAny`), no errors |
| Type check → exit 0 | ✅ | `tsc --noEmit` produced no output |
| Build → exit 0 | ✅ | `next build` succeeded; `/api/seed` and `/api/seed/status` listed as dynamic routes |
| `src/app/api/seed/route.ts` exists and exports `POST` | ✅ | Pre-existing from F15; verified correct against spec |
| `src/app/api/seed/status/route.ts` exists and exports `GET` | ✅ | Pre-existing from F15; verified correct against spec |
| `src/app/api/seed/__tests__/route.test.ts` exists | ✅ | Created this sprint |
| `src/app/api/seed/status/__tests__/route.test.ts` exists | ✅ | Created this sprint |
| HTTP check: POST `/api/seed` | Integration gap | Requires live ClickHouse + dev server |
| HTTP check: GET `/api/seed/status` | Integration gap | Requires live ClickHouse + dev server |

## Files created / modified

- `src/app/api/seed/__tests__/route.test.ts` — **created**: unit tests for POST /api/seed mocking `@/lib/seed`
- `src/app/api/seed/status/__tests__/route.test.ts` — **created**: unit tests for GET /api/seed/status mocking `@/lib/clickhouse`; lint auto-fixed the `makeQueryResult` function signature formatting

## Known gaps

- HTTP checks (POST `/api/seed` and GET `/api/seed/status`) require a running ClickHouse instance and dev server; these are marked as integration gaps in the plan and not verified here.

## Issues logged

None
