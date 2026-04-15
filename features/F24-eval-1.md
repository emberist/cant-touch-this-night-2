# F24 Eval Sprint 1 — 2026-04-15

## Tests written

- `playwright_tests/funnels.spec.ts` — covers the integration gap: GET `/funnels` must render `data-testid="step-builder"`, `data-testid="funnel-date-range"`, `data-testid="funnel-chart"`; also verifies heading, default 2 comboboxes, Add Step interaction, and Run Funnel button presence.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `pnpm test` → 0 failures | 0 failures | 0 failures (386 passing, 25 skipped) | ✅ |
| `pnpm lint` → exit 0 | exit 0 | exit 0 (7 pre-existing warnings, no errors) | ✅ |
| `pnpm typecheck` → exit 0 | exit 0 | exit 0 | ✅ |
| `pnpm build` → exit 0 | exit 0 | exit 0 (`/funnels` in build output) | ✅ |
| `src/components/funnels/useFunnels.ts` exports `useFunnels` | exported | `export function useFunnels()` at line 39 | ✅ |
| `src/components/funnels/StepBuilder.tsx` exports `StepBuilder` | exported | `export function StepBuilder()` at line 23 | ✅ |
| `src/components/funnels/FunnelDateRange.tsx` exports `FunnelDateRange` | exported | `export function FunnelDateRange()` at line 32 | ✅ |
| `src/components/FunnelChart.tsx` exports `FunnelChart` | exported | `export function FunnelChart()` at line 31 | ✅ |
| `src/app/funnels/page.tsx` contains `"use client"` and imports `useFunnels` | both present | `"use client"` line 1; `import { useFunnels }` line 10 | ✅ |
| HTTP GET `/funnels` contains `data-testid="step-builder"` | present | confirmed via curl against dev server | ✅ |
| HTTP GET `/funnels` contains `data-testid="funnel-date-range"` | present | confirmed via curl against dev server | ✅ |
| HTTP GET `/funnels` contains `data-testid="funnel-chart"` | present | confirmed via curl against dev server | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

- Unit tests are correct and cover all cases in the test plan. No fixes needed.
- The `FunnelChart` loading state shows the skeleton *and* still renders the `data-testid="funnel-chart"` wrapper — the chart-steps sub-container is correctly suppressed while loading. Tests accurately reflect this.
- The `useFunnels` hook uses `setEndDate(todayISO)` (a function reference, not a call) for the initial state — `useState(todayISO)` is valid React lazy initializer syntax; this is correct.
- Playwright e2e tests written (`playwright_tests/funnels.spec.ts`) covering 8 scenarios. They require a running server (same pre-condition as the existing trends spec).
- No MEMORY.md update warranted — no non-obvious generator failure detected; all patterns follow the established Trends page convention exactly.
