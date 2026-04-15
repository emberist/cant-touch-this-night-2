# F9 Eval Sprint 1 — 2026-04-15

## Tests written

No new tests written. The plan explicitly states "All cases are unit-testable using `vi.useFakeTimers()` / `vi.advanceTimersByTime()` — no integration gaps." The generator's unit test file `src/lib/__tests__/schema-cache.test.ts` was run as-is and covers all 7 plan cases. No e2e tests warranted — the feature introduces no new page or user-facing flow.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `src/lib/schema-cache.ts` exists and exports `getCachedSchema`, `setCachedSchema`, `invalidateSchemaCache`, `SchemaResponse` | All 4 symbols present | All 4 symbols present | ✅ |
| `getCachedSchema` returns `null` when no value cached | `null` | `null` — `entry === null` branch returns immediately | ✅ |
| `getCachedSchema` returns cached value within 60-second TTL | non-null value | returns value when `Date.now() - cachedAt < 60000` | ✅ |
| `getCachedSchema` returns `null` at or after 60-second TTL | `null` | `>= TTL_MS` boundary — at exactly 60 000 ms returns null | ✅ |
| `invalidateSchemaCache` clears cache → `getCachedSchema` returns `null` | `null` | sets `entry = null` | ✅ |
| Test suite → `pnpm test` → 0 failures | 0 failures | 94 passing, 16 skipped, 0 failing | ✅ |
| Lint check → `pnpm lint` → exit 0 | exit 0 | "Checked 35 files. No fixes applied." | ✅ |
| Type check → `pnpm typecheck` → exit 0 | exit 0 | no errors | ✅ |
| Build check → `pnpm build` → exit 0 | exit 0 | all routes compiled | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

- Implementation is minimal and correct. TTL boundary uses `>=` so the cache expires at exactly 60 s — matches the test expectation.
- Route integration (`src/app/api/schema/route.ts`) correctly calls `getCachedSchema()` before the ClickHouse query (line 18) and `setCachedSchema()` after building the response (line 79).
- No e2e infrastructure gaps — Playwright exists in the repo but this feature warrants no new e2e coverage.
