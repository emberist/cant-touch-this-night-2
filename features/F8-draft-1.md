# F8 Sprint 1 — 2026-04-15

## Test files written

- `src/lib/__tests__/schema-cache.test.ts` — covers: cache miss on empty cache, cache hit within TTL, cache miss after TTL expiry, cache miss after manual invalidation, re-set after invalidation, last-write-wins
- `src/app/api/schema/__tests__/route.test.ts` — covers: 200 response shape, empty DB returns `{ event_names: [], properties: {} }`, distinct event names returned, `"numeric"` inferred when `is_numeric = 1`, `"string"` inferred when `is_numeric = 0`, mixed property types per event, caching (ClickHouse queried only once on second call), re-query after `invalidateSchemaCache`, empty `property_key` rows don't pollute `properties`

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| `src/lib/schema-cache.ts` exists and exports get/set/invalidate | ✅ | Exports `getCachedSchema`, `setCachedSchema`, `invalidateSchemaCache` |
| `src/app/api/schema/route.ts` exists and exports `GET` | ✅ | |
| Test suite → `pnpm test` → 0 failures | ✅ | 94 passing, 16 skipped (pre-existing skips), 0 failing |
| Lint check → `pnpm lint` → exit 0 | ✅ | `Checked 35 files. No fixes applied.` |
| Type check → `pnpm typecheck` → exit 0 | ✅ | No output (clean) |
| Build check → `pnpm build` → exit 0 | ✅ | `/api/schema` appears as `ƒ (Dynamic)` route |
| HTTP check: GET `/api/schema` returns `event_names` + `properties` | — | **Integration gap** — requires running dev server with ClickHouse |

## Files created / modified

- `src/lib/schema-cache.ts` — created: TTL-based in-memory cache (60 s) exporting `getCachedSchema`, `setCachedSchema`, `invalidateSchemaCache`
- `src/lib/__tests__/schema-cache.test.ts` — created: 7 unit tests for the cache module
- `src/app/api/schema/route.ts` — created: `GET /api/schema` handler; single ClickHouse query samples last 10,000 events with `ARRAY JOIN arrayJoin(JSONExtractKeys(...))`, aggregates `is_numeric` via `maxIf(1, JSONExtractFloat(...) != 0)`, groups in application code, caches 60 s
- `src/app/api/schema/__tests__/route.test.ts` — created: 10 unit tests for the route handler (mocks ClickHouse and partially mocks schema-cache)

## Known gaps

- HTTP check (integration): requires a running dev server + ClickHouse with seeded data. Not automatable as a unit test — flagged as integration gap in the plan.

## Issues logged

None
