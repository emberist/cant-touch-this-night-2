# F10 Eval Sprint 1 — 2026-04-15

## Tests written

- `src/app/api/trends/__tests__/route.integration.test.ts` — HTTP integration tests for GET /api/trends covering: 200 with valid params, response shape (series array with label/data), 400 for missing event_name / start / end, 400 for invalid measure, 400 for invalid granularity. Follows the project convention of gracefully skipping when the dev server is not available.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| Test suite → 0 failures | 0 failures | 0 failures (145 passed, 16 skipped) | ✅ |
| Linter → `pnpm lint` exits 0 | exit 0 | exit 0 ("No fixes applied") | ✅ |
| Type check → `pnpm typecheck` exits 0 | exit 0 | exit 0 (no errors) | ✅ |
| Build → `pnpm build` exits 0 | exit 0 | exit 0 (`/api/trends` listed as Dynamic route) | ✅ |
| `src/lib/trends.ts` exports `queryTrends` | exported | exported at line 144 | ✅ |
| `src/app/api/trends/route.ts` exports `GET` | exported | exported at line 34 | ✅ |
| `src/lib/__tests__/trends.test.ts` exists | exists | exists (16 tests, all passing) | ✅ |
| `src/app/api/trends/__tests__/route.test.ts` exists | exists | exists (22 tests, all passing) | ✅ |

## Behaviour review

- `unique_users` measure includes `LEFT JOIN (SELECT device_id, user_id FROM identity_mappings FINAL) m ON e.device_id = m.device_id` and uses `uniqExact(coalesce(e.user_id, m.user_id, e.device_id))` — correct per SPEC §5 read path.
- `sum/avg/min/max` measures use `JSONExtractFloat(e.properties, '<prop>')` — correct per SPEC §4.5.
- `end` is inclusive: `computeEndExclusive` adds one day, making the WHERE `timestamp < day_after_end` — correct per plan decision.
- `granularity=week` uses `toMonday()` — ISO 8601 convention, documented in plan as deliberate choice.
- `breakdown_limit` defaults to 10; "Other" series aggregates remainder by date bucket — correct per SPEC §6.4.
- Without breakdown, single series with `label = event_name` — correct.
- Route returns 400 for: missing `event_name`, missing `start`, missing `end`, invalid `measure` (`sum:` with no property, unknown string), invalid `granularity` — all correct.

## Score: 10/10

## Verdict: APPROVED

## Notes

- The integration tests in `route.integration.test.ts` gracefully skip when the dev server is not running (matches the convention established by `src/app/api/events/__tests__/route.integration.test.ts`). They will exercise the live route when `pnpm dev` is running.
- No spec ambiguities or bugs were found. The generator's self-evaluation was accurate.
- No MEMORY.md entries warranted: all findings are derivable from the code.
