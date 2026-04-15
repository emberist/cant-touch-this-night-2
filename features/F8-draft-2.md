# F8 Sprint 2 — 2026-04-15

## Test files written

No new test files written — the unit tests from Sprint 1 already cover all criteria:
- `src/lib/__tests__/schema-cache.test.ts` — cache hit within TTL, miss after TTL, manual invalidation
- `src/app/api/schema/__tests__/route.test.ts` — response shape, type inference, caching, empty-DB edge case

## Sprint contract results

| Criterion | Result | Notes |
|---|---|---|
| `src/lib/schema-cache.ts` exports get/set/invalidate | ✅ | Unchanged from Sprint 1 |
| `src/app/api/schema/route.ts` exports `GET` | ✅ | Fixed SQL query |
| Test suite → 0 failures | ✅ | 94 passed, 16 skipped, 0 failing |
| Lint exit 0 | ✅ | `Checked 35 files. No fixes applied.` |
| Type check exit 0 | ✅ | No output (clean) |
| Build exit 0 | ✅ | `/api/schema` listed as `ƒ (Dynamic)` route |
| HTTP check: GET `/api/schema` → JSON with `event_names` + `properties` | Integration gap | Requires running dev server + ClickHouse |

## Files created / modified

- `src/app/api/schema/route.ts` — Fixed SQL at line 43: replaced `ARRAY JOIN arrayJoin(JSONExtractKeys(properties)) AS property_key` with `LEFT ARRAY JOIN JSONExtractKeys(properties) AS property_key`

### What the fix does

`arrayJoin(...)` is a ClickHouse table function that returns scalar `String` rows. The `ARRAY JOIN` clause is a separate mechanism that expands an `Array(String)` — combining them passed a `String` to a clause expecting `Array` or `Map`, causing TYPE_MISMATCH (code 53).

Switching to `LEFT ARRAY JOIN JSONExtractKeys(properties) AS property_key` also resolves the secondary issue from the eval: events with `properties = '{}'` were silently dropped by a plain `ARRAY JOIN` because `JSONExtractKeys('{}')` returns an empty array. `LEFT ARRAY JOIN` preserves these rows, setting `property_key` to `''` (empty string) — which the existing `if (!row.property_key) continue` guard already handles, so those events appear in `event_names` even when they have no properties.

## Known gaps

- HTTP check requires a running dev server + local ClickHouse instance with `.env.local` setting `CLICKHOUSE_PASSWORD=` (empty) or matching the configured password. This is an environment setup gap, not an implementation issue.

## Issues logged

None
