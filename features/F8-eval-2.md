# F8 Eval Sprint 2 — 2026-04-15

## Tests written

No new test files written. The unit tests from Sprint 1 already cover all unit-testable criteria:
- `src/lib/__tests__/schema-cache.test.ts` — cache hit/miss within TTL, TTL expiry, manual invalidation, re-set after invalidation
- `src/app/api/schema/__tests__/route.test.ts` — response shape, empty-DB edge case, event name extraction, numeric/string type inference, caching (ClickHouse called once), invalidation triggers re-query, empty property_key handling

No integration/e2e test files were written in Sprint 1 either. The "HTTP check" was verified manually in Phase B below.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `src/lib/schema-cache.ts` exports `getCachedSchema`, `setCachedSchema`, `invalidateSchemaCache` | All three exported | All three exported with correct signatures | ✅ |
| `src/app/api/schema/route.ts` exports `GET` | Named export `GET` | Exported, async GET handler present | ✅ |
| Test suite → 0 failures | 0 failures | 94 passed, 16 skipped, 0 failing | ✅ |
| Lint check → exit 0 | exit 0 | `Checked 35 files. No fixes applied.` | ✅ |
| Type check → exit 0 | exit 0 | No output (clean) | ✅ |
| Build check → exit 0 | `/api/schema` listed as `ƒ (Dynamic)` route | `/api/schema` appears as Dynamic | ✅ |
| HTTP check: GET `/api/schema` → JSON with `event_names` + `properties` | 200 JSON response | `{"event_names":["Empty Event","Page Viewed"],"properties":{"Page Viewed":{"amount":"numeric","page":"string"}}}` | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

**Fix from Sprint 1 confirmed working.** The SQL at `src/app/api/schema/route.ts:43` now correctly uses `LEFT ARRAY JOIN JSONExtractKeys(properties) AS property_key` instead of the broken `ARRAY JOIN arrayJoin(...)` combination. The HTTP 500 TYPE_MISMATCH error from Sprint 1 is resolved.

**`LEFT ARRAY JOIN` secondary fix also confirmed.** The HTTP response showed `"Empty Event"` in `event_names` — an event with `properties = '{}'`. The `LEFT ARRAY JOIN` correctly preserves the row (producing `property_key = ''`), and the `if (!row.property_key) continue` guard omits it from `properties` while the `eventNamesSet.add(row.event_name)` line still runs. This matches the spec requirement that all distinct event names appear in the response.

**Environment note (carried from Eval 1):** `.env.local` is not committed. Local ClickHouse runs without a password, but `src/lib/clickhouse.ts` defaults `CLICKHOUSE_PASSWORD` to `"password"`. HTTP checks require `CLICKHOUSE_PASSWORD=""` in the environment. This is a setup gap for new contributors, not an implementation bug.

**Numeric detection heuristic works as specified.** The sampled data contained a numeric `amount` property (correctly typed `"numeric"`) and a string `page` property (correctly typed `"string"`).
