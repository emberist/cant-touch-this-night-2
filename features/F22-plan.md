# F22 Plan

## Acceptance criteria

From SPEC.md §7.3 — Trends / Insights (`/trends`):

Controls panel:
- Event name selector (autocomplete from schema)
- Measure selector: Count / Unique Users / Sum of / Avg of / Min of / Max of [property]
  - Property dropdown appears only for aggregation measures; restricted to numeric properties
- Granularity toggle: Day / Week
- Date range: preset chips (Last 7d, Last 30d, Last 90d) + custom date picker
- Breakdown selector (optional): property dropdown + limit

Chart panel:
- Recharts `LineChart` by default
- Chart type switcher (BR-301): Line / Bar / Area / Table
- Sensible defaults: Line for time series; when only one date bucket, auto-switch to Bar

## Dependencies

Completed features this builds on:

- **F1** (ClickHouse client singleton) — `src/lib/clickhouse.ts`
- **F8** (GET /api/schema) — `src/app/api/schema/route.ts`
- **F9** (In-memory schema cache) — `src/lib/schema-cache.ts`
- **F10** (GET /api/trends with count, unique_users, numeric aggregations) — `src/app/api/trends/route.ts`, `src/lib/trends.ts`
- **F11** (Breakdown and breakdown_limit in GET /api/trends) — same route, extended
- **F18** (MUI navigation shell) — `src/app/layout.tsx`, `src/components/Sidebar.tsx`

Key files that will be imported or extended:

- `src/app/trends/page.tsx` — existing placeholder to replace
- `src/app/api/trends/route.ts` — backend already implemented; consumed via fetch
- `src/app/api/schema/route.ts` — backend already implemented; consumed via fetch
- `src/lib/trends.ts` — `TrendsResponse`, `Series`, `SeriesPoint` types (may be imported for type-safety)
- `src/lib/schema-cache.ts` — `SchemaResponse` type (for schema fetch typing)

## Files to create or modify

- CREATE `src/components/trends/useTrends.ts` — custom hook: manages control state, fetches `/api/trends`, returns series data + loading/error state
- CREATE `src/components/trends/TrendsControls.tsx` — client component: event name autocomplete, measure selector, granularity toggle, date range presets + custom picker, breakdown selector + limit
- CREATE `src/components/TrendChart.tsx` — client component: renders Recharts chart with Line/Bar/Area/Table toggle; auto-switches to Bar when single bucket
- MODIFY `src/app/trends/page.tsx` — replace placeholder with full Trends page composing controls + chart

## Implementation order

1. **Install `recharts`** — Add the `recharts` dependency (`pnpm add recharts`). It is not currently installed but is required by the spec for chart rendering.

2. **Create `src/components/trends/useTrends.ts`** — Custom hook managing all trends query state:
   - Control state: `eventName`, `measure`, `granularity`, `startDate`, `endDate`, `breakdown`, `breakdownLimit`
   - Defaults: measure `"count"`, granularity `"day"`, date range last 30 days, no breakdown, breakdown_limit 10
   - Fetches `/api/schema` on mount to get event names and per-event properties (with types)
   - Fetches `/api/trends` when controls change (debounced or on explicit trigger)
   - Returns `{ schema, controls, setters, series, loading, error }`
   - Derives numeric properties for the selected event from the schema response

3. **Create `src/components/trends/TrendsControls.tsx`** — Client component rendering:
   - MUI `Autocomplete` for event name (populated from schema)
   - MUI `Select` for measure (Count, Unique Users, Sum of, Avg of, Min of, Max of) + a secondary `Autocomplete` for property name that only appears for aggregation measures (sum/avg/min/max) and is restricted to numeric properties
   - MUI `ToggleButtonGroup` for granularity (Day / Week)
   - Date range: MUI `Chip` presets (Last 7d, Last 30d, Last 90d) + two `TextField type="date"` inputs for custom range
   - MUI `Autocomplete` for optional breakdown property + `TextField` for breakdown_limit
   - Receives state and setters from `useTrends` as props

4. **Create `src/components/TrendChart.tsx`** — Client component rendering:
   - Chart type selector: MUI `ToggleButtonGroup` with Line / Bar / Area / Table options
   - Recharts `ResponsiveContainer` wrapping `LineChart`, `BarChart`, or `AreaChart` based on selection
   - For Table mode: MUI `Table` showing date rows × series columns
   - Auto-switch: when series data has only 1 date bucket, default to Bar chart
   - Multi-series support for breakdown results (one line/bar per series label)
   - Loading skeleton when data is being fetched
   - Empty state when no series data returned

5. **Modify `src/app/trends/page.tsx`** — Replace placeholder with full page:
   - `"use client"` directive
   - Compose `useTrends` hook, `TrendsControls`, and `TrendChart`
   - Page title "Trends"
   - Layout: controls panel at top, chart panel below

## Sprint contract

- [ ] `pnpm test` (vitest run) → 0 failures
- [ ] `pnpm lint` (biome check) → exit 0
- [ ] `pnpm typecheck` (tsc --noEmit) → exit 0
- [ ] `pnpm build` (next build) → exit 0
- [ ] File `src/components/trends/useTrends.ts` exists and exports a `useTrends` function
- [ ] File `src/components/trends/TrendsControls.tsx` exists and exports a named `TrendsControls` component
- [ ] File `src/components/TrendChart.tsx` exists and exports a named `TrendChart` component
- [ ] File `src/app/trends/page.tsx` exists and imports `TrendChart`
- [ ] File `src/app/trends/page.tsx` exists and imports `TrendsControls`
- [ ] HTTP check: GET `http://localhost:3000/trends` → response contains `Trends`
- [ ] HTTP check: GET `http://localhost:3000/trends` → response contains `data-testid="trends-controls"` or the controls container
- [ ] HTTP check: GET `http://localhost:3000/trends` → response contains `data-testid="trend-chart"` or the chart container

## Test plan

- **Test file**: `src/components/trends/__tests__/useTrends.test.ts`
- **Module under test**: `useTrends`
- **Cases to cover**:
  - Fetches schema from `/api/schema` on mount and exposes event names
  - Fetches trends data from `/api/trends` when event name is set and date range is valid
  - Derives numeric-only properties for the selected event name from the schema
  - Sets loading to true during fetch, false on completion
  - Defaults: measure is `"count"`, granularity is `"day"`, date range is last 30 days
  - Changing event name triggers a new fetch with updated params
  - Handles fetch errors gracefully (sets error state, series remains empty)

- **Test file**: `src/components/trends/__tests__/TrendsControls.test.tsx`
- **Module under test**: `TrendsControls`
- **Cases to cover**:
  - Renders event name autocomplete with provided event names
  - Renders measure selector with all six options (Count, Unique Users, Sum of, Avg of, Min of, Max of)
  - Property dropdown is hidden when measure is "count" or "unique_users"
  - Property dropdown appears when measure is an aggregation (sum/avg/min/max) and shows only numeric properties
  - Renders granularity toggle with Day and Week options
  - Renders date range preset chips (Last 7d, Last 30d, Last 90d)
  - Renders breakdown property selector

- **Test file**: `src/components/__tests__/TrendChart.test.tsx`
- **Module under test**: `TrendChart`
- **Cases to cover**:
  - Renders chart type toggle with Line, Bar, Area, Table options
  - Renders empty state when series array is empty
  - Renders loading skeleton when loading is true
  - Auto-switches to Bar chart type when series data has exactly 1 data point (single bucket)
  - In Table mode, renders an MUI table with date rows and series columns

- **Integration gap**: HTTP check for GET `/trends` rendering the full page — requires dev server
- **Integration gap**: Chart rendering with actual Recharts components — Recharts requires a real DOM with dimensions; jsdom has zero-size containers, so Recharts renders nothing. Chart rendering verification requires e2e tests.
- **Integration gap**: Full end-to-end flow (seed data → select event → verify chart shows data) — requires running ClickHouse + Next.js

## Risks and open questions

1. **Recharts not installed**: The spec mandates Recharts but it is not in `package.json`. The generator must run `pnpm add recharts` before implementing the chart component. If the Recharts API has changed significantly from the version assumed in training data, the generator should check the installed version's exports.

2. **Recharts + jsdom limitations**: Recharts relies on SVG and container dimensions. In jsdom (used by vitest for component tests), `ResponsiveContainer` renders with zero width/height, so charts produce no visible SVG paths. Component tests for `TrendChart` should test control logic (chart type selection, auto-switch, empty/loading states) rather than asserting on rendered SVG elements. Full chart rendering is an integration gap.

3. **Date picker UX**: The spec calls for "custom date picker" but MUI v9 date pickers require `@mui/x-date-pickers` (not installed). Using native `<input type="date">` via MUI `TextField` is acceptable and avoids an extra dependency. The generator should use `TextField` with `type="date"` for custom date inputs.

4. **Breakdown limit input**: The spec shows a `breakdown_limit` parameter but doesn't specify the exact UI. A simple numeric `TextField` alongside the breakdown property selector is sufficient.
