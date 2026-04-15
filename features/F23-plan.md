# F23 Plan

## Acceptance criteria

From SPEC.md §7.3 — Trends / Insights (`/trends`), Chart panel:

- Recharts `LineChart` by default
- Chart type switcher (BR-301): Line / Bar / Area / Table
- Sensible defaults: Line for time series; when only one date bucket, auto-switch to Bar

## Dependencies

Completed features this builds on:

- **F10** (GET /api/trends) — `src/app/api/trends/route.ts`, `src/lib/trends.ts` (provides `Series`, `SeriesPoint` types)
- **F11** (Breakdown support in GET /api/trends) — multi-series response shape
- **F22** (Trends page with controls) — `src/app/trends/page.tsx`, `src/components/trends/useTrends.ts`, `src/components/trends/TrendsControls.tsx`

Key files imported or extended:

- `src/lib/trends.ts` — `Series`, `SeriesPoint` types
- `src/app/trends/page.tsx` — imports and renders `TrendChart`
- `src/components/trends/useTrends.ts` — provides `series` and `loading` state consumed by `TrendChart`

**Note:** F22 already created `src/components/TrendChart.tsx` with full implementation of all F23 acceptance criteria (LineChart, chart type switcher, auto-switch, Table view, loading/empty states) and a comprehensive test suite at `src/components/__tests__/TrendChart.test.tsx`. The implementation is complete and all tests pass.

## Files to create or modify

- VERIFY `src/components/TrendChart.tsx` — already exists; confirm it exports `TrendChart`, renders Recharts `LineChart`/`BarChart`/`AreaChart`/`Table`, has chart type switcher with `ToggleButtonGroup`, and auto-switches to Bar on single bucket
- VERIFY `src/components/__tests__/TrendChart.test.tsx` — already exists; confirm tests cover toggle rendering, empty state, loading state, auto-switch, and table mode
- VERIFY `src/app/trends/page.tsx` — already imports and renders `TrendChart`

No new files need to be created. No modifications needed unless a gap is found during verification.

## Implementation order

1. **Verify `src/components/TrendChart.tsx` exports and interface** — Confirm the component exports a named `TrendChart` function, accepts `{ series: Series[]; loading: boolean }` props, and renders the `data-testid="trend-chart"` container.

2. **Verify chart type switcher** — Confirm `ToggleButtonGroup` with four options: `line`, `bar`, `area`, `table`. Confirm the `onChange` handler updates internal `chartType` state.

3. **Verify Recharts chart rendering** — Confirm `LineChart`, `BarChart`, `AreaChart` are rendered inside `ResponsiveContainer` based on selected chart type, with `CartesianGrid`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, and per-series `Line`/`Bar`/`Area` elements.

4. **Verify auto-switch logic** — Confirm that when all series have exactly 1 data point, `chartType` defaults to `"bar"`. When series have multiple data points, defaults to `"line"`. The `useEffect` re-evaluates on series change.

5. **Verify Table view** — Confirm Table mode renders an MUI `Table` with a Date column and one column per series label, with correct value lookup.

6. **Verify loading and empty states** — Confirm loading shows `Skeleton`, empty (no series, not loading) shows "No data" text.

7. **Verify test suite** — Run existing `src/components/__tests__/TrendChart.test.tsx` and confirm all tests pass.

## Sprint contract

- [ ] `pnpm test` (vitest run) → 0 failures
- [ ] `pnpm lint` (biome check) → exit 0
- [ ] `pnpm typecheck` (tsc --noEmit) → exit 0
- [ ] `pnpm build` (next build) → exit 0
- [ ] File `src/components/TrendChart.tsx` exists and exports `TrendChart`
- [ ] File `src/components/TrendChart.tsx` imports `LineChart`, `BarChart`, `AreaChart` from `recharts`
- [ ] File `src/components/TrendChart.tsx` imports `ToggleButtonGroup` and `ToggleButton` from `@mui/material`
- [ ] File `src/components/TrendChart.tsx` contains chart type values `"line"`, `"bar"`, `"area"`, `"table"`
- [ ] File `src/app/trends/page.tsx` imports `TrendChart` from `@/components/TrendChart`
- [ ] HTTP check: GET `http://localhost:3000/trends` → response contains `data-testid="trend-chart"`

## Test plan

- **Test file**: `src/components/__tests__/TrendChart.test.tsx` (already exists)
- **Module under test**: `TrendChart`
- **Cases to cover**:
  - Renders chart type toggle with all four options (Line, Bar, Area, Table)
  - Renders empty state when series is empty and loading is false
  - Renders loading skeleton when loading is true
  - Auto-switches to Bar chart type when all series have exactly 1 data point (single bucket)
  - Defaults to Line chart type when series have multiple data points
  - Switching to Table mode renders an MUI Table with date column data
  - Table mode does not render Recharts chart components
  - Renders container with `data-testid="trend-chart"`

All tests above are already implemented and passing. No new tests needed.

- **Integration gap**: HTTP check for GET `/trends` containing `data-testid="trend-chart"` — requires dev server
- **Integration gap**: Visual verification of actual Recharts SVG rendering — Recharts requires real DOM dimensions; jsdom renders zero-size containers. Full chart rendering verification requires e2e tests.

## Risks and open questions

None. The TrendChart component was fully implemented as part of F22 and all acceptance criteria are met. The only risk is if the evaluator expects new code to be written — but the component already satisfies every requirement in SPEC.md §7.3 Chart panel and BR-301.
