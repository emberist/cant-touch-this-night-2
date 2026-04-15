# F12 Sprint 1 — 2026-04-15

## Test files written

- `src/lib/__tests__/funnels.test.ts` — covers all `buildFunnelQuery` SQL structure criteria and all `queryFunnel` result-transformation criteria (cumulative counts, conversion rates, empty result, division-by-zero, string coercion)
- `src/app/api/funnels/__tests__/route.test.ts` — covers all POST validation (400), success (200), and error-forwarding (500) criteria

## Sprint contract results

| Criterion                                                                 | Result | Notes                       |
| ------------------------------------------------------------------------- | ------ | --------------------------- |
| `pnpm test` → 0 failures                                                  | ✅     | 179 passed, 16 skipped      |
| `pnpm lint` → exit 0                                                      | ✅     | No fixes applied after fix  |
| `pnpm typecheck` → exit 0                                                 | ✅     | No errors                   |
| `pnpm build` → exit 0                                                     | ✅     | `/api/funnels` appears in route table |
| `src/lib/funnels.ts` exists and exports `buildFunnelQuery`, `queryFunnel`, `FunnelParams`, `FunnelResponse` | ✅ | All four exported |
| `src/app/api/funnels/route.ts` exists and exports `POST`                  | ✅     |                             |
| `src/lib/__tests__/funnels.test.ts` exists and contains test cases        | ✅     | 19 test cases               |
| `src/app/api/funnels/__tests__/route.test.ts` exists and contains test cases | ✅  | 10 test cases               |

## Files created / modified

- `src/lib/funnels.ts` — new: `FunnelParams`, `FunnelStepResult`, `FunnelResponse`, `FunnelQuerySpec` types; `buildFunnelQuery` (SQL with `windowFunnel`, parameterized step conditions, resolved identity JOIN); `queryFunnel` (executes query, computes cumulative user counts, conversion rates)
- `src/app/api/funnels/route.ts` — new: POST handler with steps/start/end validation, delegates to `queryFunnel`
- `src/lib/__tests__/funnels.test.ts` — new: unit tests for lib
- `src/app/api/funnels/__tests__/route.test.ts` — new: unit tests for route handler

## Known gaps

None. All sprint contract criteria pass.

## Issues logged

None.
