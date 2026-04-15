# F24 Sprint 1 — 2026-04-15

## Test files written

- `src/components/funnels/__tests__/useFunnels.test.ts` — initial state (2 empty steps, null result, default dates), addStep (max 5), removeStep (min 2), setStep, runFunnel validation (no fetch < 2 steps, fetch when valid), loading state, result/error state
- `src/components/funnels/__tests__/StepBuilder.test.tsx` — data-testid container, correct combobox count, Add Step (enabled/disabled, callback), Remove buttons (enabled/disabled, callback with index)
- `src/components/__tests__/FunnelChart.test.tsx` — data-testid container, loading skeleton, empty state, user counts, step names, conversion annotations (32.0%), drop-off testids, no chart when loading

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| `pnpm test` → 0 failures | ✅ | 386 passing, 25 skipped |
| `pnpm lint` → exit 0 | ✅ | 0 errors, 7 warnings (all pre-existing) |
| `pnpm typecheck` → exit 0 | ✅ | |
| `pnpm build` → exit 0 | ✅ | `/funnels` appears in build output |
| `src/components/funnels/useFunnels.ts` exports `useFunnels` | ✅ | |
| `src/components/funnels/StepBuilder.tsx` exports `StepBuilder` | ✅ | |
| `src/components/funnels/FunnelDateRange.tsx` exports `FunnelDateRange` | ✅ | |
| `src/components/FunnelChart.tsx` exports `FunnelChart` | ✅ | |
| `src/app/funnels/page.tsx` contains `"use client"` and imports `useFunnels` | ✅ | |
| HTTP GET `/funnels` contains `data-testid="step-builder"` | ✅ | Verified via curl |
| HTTP GET `/funnels` contains `data-testid="funnel-date-range"` | ✅ | Verified via curl |
| HTTP GET `/funnels` contains `data-testid="funnel-chart"` | ✅ | Verified via curl |

## Files created / modified

- **CREATE** `src/components/funnels/useFunnels.ts` — hook: schema fetch, steps state (min 2 / max 5), date range state (last 30 days default), addStep/removeStep/setStep helpers, explicit `runFunnel()` that validates and POSTs to `/api/funnels`, loading/error/result state
- **CREATE** `src/components/funnels/StepBuilder.tsx` — ordered MUI Autocomplete list; Add Step button (disabled at 5); per-step Remove buttons (disabled at 2); `data-testid="step-builder"`
- **CREATE** `src/components/funnels/FunnelDateRange.tsx` — preset chips (Last 7d / 30d / 90d) + date pickers; `data-testid="funnel-date-range"`
- **CREATE** `src/components/FunnelChart.tsx` — loading skeleton, empty state, per-step annotation rows (user count, conversion %, drop-off in red with `data-testid="funnel-dropoff"`), Recharts `BarChart layout="vertical"`; `data-testid="funnel-chart"`
- **MODIFY** `src/app/funnels/page.tsx` — full client page wiring `useFunnels` + `StepBuilder` + `FunnelDateRange` + Run Funnel button + `FunnelChart`
- **CREATE** `src/components/funnels/__tests__/useFunnels.test.ts` — 17 tests
- **CREATE** `src/components/funnels/__tests__/StepBuilder.test.tsx` — 11 tests
- **CREATE** `src/components/__tests__/FunnelChart.test.tsx` — 10 tests

## Test modification note

`src/components/funnels/__tests__/useFunnels.test.ts:221` — removed unused `options: RequestInit` parameter from a mock callback to satisfy `lint/correctness/noUnusedFunctionParameters`. The test logic is unchanged.

## Known gaps

None. All sprint contract criteria pass.

## Issues logged

None.
