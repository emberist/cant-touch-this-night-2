# F8 Eval Sprint 1 — 2026-04-15

## Tests written

No new test files were written by this evaluator. The unit tests from the generator covered all unit-testable criteria. The "HTTP check" criterion was verified manually via a running dev server + ClickHouse instance (see Phase B below).

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `src/lib/schema-cache.ts` exports get/set/invalidate | Exports `getCachedSchema`, `setCachedSchema`, `invalidateSchemaCache` | All three exported, correct signatures | ✅ |
| `src/app/api/schema/route.ts` exports `GET` | Named export `GET` | Exported, async GET handler present | ✅ |
| Test suite → 0 failures | 0 failures | 94 passed, 16 skipped, 0 failing | ✅ |
| Lint check → exit 0 | exit 0 | `Checked 35 files. No fixes applied.` | ✅ |
| Type check → exit 0 | exit 0 | No output (clean) | ✅ |
| Build check → exit 0 | `/api/schema` listed as `ƒ (Dynamic)` route | `/api/schema` appears as Dynamic | ✅ |
| HTTP check: GET `/api/schema` → JSON with `event_names` + `properties` | 200 JSON response | **500 Internal Server Error** — SQL TYPE_MISMATCH | ❌ |

## Score: 5/10

## Verdict: NEEDS_WORK

## Feedback for next sprint

| Criterion | Error | File:Line | Action |
|-----------|-------|-----------|--------|
| HTTP check: GET `/api/schema` returns JSON with `event_names` and `properties` | `ARRAY JOIN ... requires expression arrayJoin(JSONExtractKeys(properties)) AS property_key with Array or Map type. Actual: String. (TYPE_MISMATCH)` | `src/app/api/schema/route.ts:43` | Replace `ARRAY JOIN arrayJoin(JSONExtractKeys(properties)) AS property_key` with `ARRAY JOIN JSONExtractKeys(properties) AS property_key`. The `arrayJoin()` table function already expands the array into rows — wrapping it inside `ARRAY JOIN` passes a `String` to a clause that requires `Array` or `Map`. Use only the `ARRAY JOIN` clause with the raw array expression. |

## Notes

**Root cause of the bug:** The query at `src/app/api/schema/route.ts:43` uses:
```sql
ARRAY JOIN arrayJoin(JSONExtractKeys(properties)) AS property_key
```
`arrayJoin(...)` is a ClickHouse table function that returns scalar `String` rows. The `ARRAY JOIN` clause is a separate mechanism that expands an `Array(String)` column — combining them passes a `String` to a clause expecting `Array` or `Map`, causing a TYPE_MISMATCH (code 53) that bubbles up as HTTP 500.

**Correct form** (verified to work against ClickHouse v26.4.1.951):
```sql
ARRAY JOIN JSONExtractKeys(properties) AS property_key
```

**Secondary issue (spec conformance, non-blocking):** With `ARRAY JOIN JSONExtractKeys(properties)`, events whose `properties` column is `'{}'` produce an empty array and are silently dropped by `ARRAY JOIN`. Those event names therefore won't appear in `event_names`. If an event type exists in the DB but all its events have `{}` properties, it won't show up in the schema response. The spec says "distinct event names" implying all names should appear. A follow-up could use a separate `SELECT DISTINCT event_name FROM events ORDER BY event_name` query and merge results, but this is not blocking the primary fix.

**Why unit tests didn't catch this:** The ClickHouse client is mocked at the module boundary in the unit tests, so the SQL string is never parsed or executed. The TYPE_MISMATCH is only caught when the query actually runs against a real ClickHouse server. This is an inherent limitation of the mocking strategy — it validates application logic around ClickHouse but not SQL correctness.

**Environment note:** The `.env.local` file is missing from this repo (not committed, as intended). The local ClickHouse instance runs without a password, but `src/lib/clickhouse.ts` defaults `CLICKHOUSE_PASSWORD` to `"password"`. HTTP checks require either a `.env.local` with `CLICKHOUSE_PASSWORD=` (empty string) or setting the environment variable before starting the dev server. This is an environment setup gap, not an implementation bug — but it should be documented for new contributors.
