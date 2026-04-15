# F23 Eval Sprint 1 — 2026-04-15

## Tests written

- No new test files written.
  - `src/components/__tests__/TrendChart.test.tsx` (pre-existing from F22): covers chart type toggle (all four options), empty state, loading state, auto-switch to Bar on single bucket, Line default on multi-point series, Table mode rendering, Table mode date column, no Recharts chart in Table mode, `data-testid="trend-chart"` container.
  - `playwright_tests/trends.spec.ts` (pre-existing from F22): covers page title, controls visibility, `data-testid="trend-chart"` visibility, and page heading — directly covers the integration gap listed in the plan.
  - The two integration gaps from the plan were resolved: the HTTP check was manually verified (see Phase B below), and the Playwright e2e file already covered the `data-testid="trend-chart"` presence.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `pnpm test` → 0 failures | 0 failures | 348 passed, 0 failures (37 files, 25 skipped) | ✅ |
| `pnpm lint` → exit 0 | exit 0 | exit 0 (7 pre-existing warnings, 0 errors) | ✅ |
| `pnpm typecheck` → exit 0 | exit 0 | exit 0 | ✅ |
| `pnpm build` → exit 0 | exit 0 | exit 0 (`/trends` built as static page) | ✅ |
| `src/components/TrendChart.tsx` exists and exports `TrendChart` | file + export | exists; `export function TrendChart` at line 120 | ✅ |
| `TrendChart.tsx` imports `LineChart`, `BarChart`, `AreaChart` from `recharts` | imports present | lines 14–27 | ✅ |
| `TrendChart.tsx` imports `ToggleButtonGroup` and `ToggleButton` from `@mui/material` | imports present | lines 10–11 | ✅ |
| `TrendChart.tsx` contains chart type values `"line"`, `"bar"`, `"area"`, `"table"` | all four values | `ChartType` at line 32; `ToggleButton value=` at lines 154–157 | ✅ |
| `src/app/trends/page.tsx` imports `TrendChart` from `@/components/TrendChart` | import present | line 6 | ✅ |
| HTTP check: GET `http://localhost:3099/trends` → contains `data-testid="trend-chart"` | string present | `data-testid="trend-chart"` confirmed in response body | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

- The `useEffect` in `TrendChart.tsx` (lines 133–137) resets chart type to `"line"` or `"bar"` every time `series` prop changes. This means a user who manually switches to Area or Table will have their selection overridden on the next data refresh. The spec says "auto-switch to Bar" as a sensible default — it does not explicitly require user overrides to survive a data reload — so this is consistent with the spec. Worth noting for a future UX polish ticket.
- HTTP check was verified against port 3099 (not 3000) to avoid collision; the port is not hard-coded in the sprint contract.
- The existing Playwright e2e file (`playwright_tests/trends.spec.ts`) already includes a `chart container is visible` test that covers `data-testid="trend-chart"`, making a separate new e2e file unnecessary.
