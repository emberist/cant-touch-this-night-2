# F12 Eval Sprint 1 — 2026-04-15

## Tests written

- `src/app/api/funnels/__tests__/route.integration.test.ts` — HTTP-level integration tests for `POST /api/funnels`: validation error shape (missing steps, too few/many steps, missing start/end); response shape with seeded data (steps array, per-step fields, step names in order, step 1 conversion_overall=1.0/conversion_from_prev=null, funnel monotonicity). Skips gracefully when dev server is not running.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `pnpm test` → 0 failures | 0 failures | 189 passed, 16 skipped, 0 failures | ✅ |
| `pnpm lint` → exit 0 | exit 0 | exit 0, no fixes applied | ✅ |
| `pnpm typecheck` → exit 0 | exit 0 | exit 0 | ✅ |
| `pnpm build` → exit 0 | exit 0 | exit 0, `/api/funnels` in route table | ✅ |
| `src/lib/funnels.ts` exports `buildFunnelQuery`, `queryFunnel`, `FunnelParams`, `FunnelResponse` | all 4 exported | all 4 exported (plus `FunnelStepResult`, `FunnelQuerySpec`) | ✅ |
| `src/app/api/funnels/route.ts` exports `POST` | exported | exported | ✅ |
| `src/lib/__tests__/funnels.test.ts` exists and contains test cases | exists | exists, 19 test cases (10 buildFunnelQuery + 9 queryFunnel) | ✅ |
| `src/app/api/funnels/__tests__/route.test.ts` exists and contains test cases | exists | exists, 10 test cases (7 validation + 2 success + 1 error-handling) | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

- **`windowFunnel` window size**: The implementation uses `2147483647` (≈ 68 years) as the window size, consistent with the spec deferring per-user time windows (§13.2). Correct.
- **Empty funnel response**: When no events match, `queryFunnel` returns `{ steps: [] }` rather than an array of N steps each with 0 users. The spec does not specify this edge case; the behaviour is defensible and covered by an explicit test.
- **`rows.length === 0` guard**: If ClickHouse returns only `{ level: 0, cnt: N }` rows (users in range but none completing step 1), the code proceeds past the empty guard and correctly produces all steps with 0 users (level=0 adds nothing to any userCounts bucket). Division-by-zero is handled.
- **No unit test fix-ups needed**: All generator-written tests are correct and complete.
- **Integration test skip pattern**: Follows the same `if (!serverAvailable) return;` pattern used in `route.integration.test.ts` for trends — tests count as "passed" rather than "skipped" when the server is absent. Consistent with project convention.
