# F15 Sprint 1 — 2026-04-15

## Test files written

- `src/lib/__tests__/seed.test.ts` — covers all test plan criteria:
  - `generateUsers`: 70 total, 50 fully-resolved, 10 multi-device, 10 anonymous; multi-device 2–3 devices; anonymous has device but no user_id
  - `generateEvents`: ~12,000 events; all 6 event types present; Page Viewed ~40%; timestamps within range; property shapes for all 6 event types
  - `buildIdentityMappings`: 1 mapping per device for resolved users; no mappings for anonymous; total 70–80
  - `seedData`: truncates both tables; inserts events (~12,000) and identity_mappings (70–80); returns correct event/user counts

## Sprint contract results

| Criterion                                        | Result | Notes                             |
| ------------------------------------------------ | ------ | --------------------------------- |
| `src/lib/seed.ts` exists and exports `seedData`  | ✅     | confirmed via `ls`                |
| `src/app/api/seed/route.ts` exists, exports POST | ✅     | confirmed via `ls` + build output |
| `src/app/api/seed/status/route.ts` exists, exports GET | ✅ | confirmed via `ls` + build output |
| Test suite — 0 failures                          | ✅     | 238 passing, 25 skipped (integration tests without live CH), 0 failing |
| `pnpm lint` exits 0                              | ✅     | 4 warnings (noExplicitAny on mock call predicates), exit 0 |
| `pnpm typecheck` exits 0                         | ✅     | no output, exit 0                 |
| `pnpm build` exits 0                             | ✅     | both routes appear in build output |

## Files created / modified

- **CREATE** `src/lib/__tests__/seed.test.ts` — 27 unit tests covering all plan criteria
- **CREATE** `src/lib/seed.ts` — mulberry32 PRNG, `generateUsers`, `generateEvents`, `buildIdentityMappings`, `seedData`
- **CREATE** `src/app/api/seed/route.ts` — `POST /api/seed` handler calling `seedData()`
- **CREATE** `src/app/api/seed/status/route.ts` — `GET /api/seed/status` handler querying event/user counts

## Known gaps

None — all sprint contract criteria passed in self-evaluation.

`POST /api/seed` and `GET /api/seed/status` HTTP response testing is marked as **integration gap** in the test plan; those require a running ClickHouse instance and are not covered by unit tests.

The 4 `noExplicitAny` lint warnings in `seed.test.ts` are on `find` predicate callbacks against `vi.fn().mock.calls` (which is typed `any[][]`). Removing the type annotations would cause TypeScript errors. These are warnings only and do not affect the exit code.

## Issues logged

None
