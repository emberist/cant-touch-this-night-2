# F24 Plan

## Acceptance criteria

From SPEC.md §7.4 — Funnels (`/funnels`):

- Step builder: ordered list of event name selectors (2–5 steps, add/remove buttons)
- Date range selector (same presets as Trends: Last 7d, Last 30d, Last 90d + custom date picker)
- Result: horizontal funnel bar chart showing user count per step, with conversion % annotations
- Drop-off percentage highlighted in red between steps

From SPEC.md §6.5 — POST /api/funnels (already built in F12):

- Body: `{ steps, start, end }` — 2–5 event name strings, ISO date range
- Response: per-step counts and conversion rates (`users`, `conversion_from_prev`, `conversion_overall`)

## Dependencies

Completed features this builds on:

- **F8** (`GET /api/schema`) — provides event name autocomplete list
- **F9** (`src/lib/schema-cache.ts`) — schema types
- **F12** (`POST /api/funnels` + `src/lib/funnels.ts`) — backend API route + query logic
- **F18** (layout shell + sidebar) — navigation already includes Funnels link

Exact file paths imported or extended:

- `src/app/funnels/page.tsx` — MODIFY (currently a placeholder)
- `src/app/api/funnels/route.ts` — EXISTS, no changes needed
- `src/lib/funnels.ts` — EXISTS, types imported (`FunnelResponse`, `FunnelStepResult`)
- `src/lib/schema-cache.ts` — EXISTS, types imported (`SchemaResponse`)

## Files to create or modify

- CREATE `src/components/funnels/useFunnels.ts` — client-side hook: schema fetch, step state, date range state, POST to `/api/funnels`, response state
- CREATE `src/components/funnels/StepBuilder.tsx` — ordered list of Autocomplete selectors with add/remove buttons (2–5 steps)
- CREATE `src/components/funnels/FunnelDateRange.tsx` — date range controls (preset chips + custom date pickers), same pattern as TrendsControls
- CREATE `src/components/FunnelChart.tsx` — horizontal bar chart with Recharts `BarChart` (horizontal layout), user counts, conversion % annotations, red drop-off highlights
- MODIFY `src/app/funnels/page.tsx` — wire up `useFunnels` hook, `StepBuilder`, `FunnelDateRange`, and `FunnelChart`
- CREATE `src/components/funnels/__tests__/useFunnels.test.ts` — unit tests for the hook
- CREATE `src/components/funnels/__tests__/StepBuilder.test.tsx` — unit tests for step builder logic
- CREATE `src/components/__tests__/FunnelChart.test.tsx` — unit tests for funnel chart

## Implementation order

1. **Create `src/components/funnels/useFunnels.ts`** — hook managing: schema fetch from `/api/schema`, steps array state (default 2 empty strings), date range state (default last 30 days), `addStep`/`removeStep`/`setStep` helpers, POST to `/api/funnels` when steps are valid and date range is set, loading/error/result state.

2. **Create `src/components/funnels/StepBuilder.tsx`** — renders an ordered list of MUI Autocomplete inputs populated from schema event names. Each row: step number label, Autocomplete, remove button (disabled when 2 steps). Add Step button at bottom (disabled when 5 steps). Receives steps array, event names, and setters as props.

3. **Create `src/components/funnels/FunnelDateRange.tsx`** — preset chips (Last 7d, Last 30d, Last 90d) + two date inputs (Start, End). Same pattern as the date range section in `TrendsControls`. Receives `startDate`, `endDate`, and setters as props.

4. **Create `src/components/FunnelChart.tsx`** — horizontal bar chart using Recharts `BarChart` with `layout="vertical"`. Shows one bar per funnel step, bar width proportional to user count. Annotations: user count on each bar, conversion_from_prev percentage between bars, conversion_overall. Drop-off percentage (1 − conversion_from_prev) highlighted in red text between steps. Loading skeleton and empty state.

5. **Modify `src/app/funnels/page.tsx`** — make it a `"use client"` page. Wire `useFunnels` hook, render `StepBuilder`, `FunnelDateRange`, a Run Funnel button, and `FunnelChart` with results.

6. **Create unit tests** — `useFunnels.test.ts`, `StepBuilder.test.tsx`, `FunnelChart.test.tsx`.

## Sprint contract

- [ ] `pnpm test` → 0 failures
- [ ] `pnpm lint` → exit 0
- [ ] `pnpm typecheck` → exit 0
- [ ] `pnpm build` → exit 0
- [ ] File `src/components/funnels/useFunnels.ts` exists and exports `useFunnels`
- [ ] File `src/components/funnels/StepBuilder.tsx` exists and exports `StepBuilder`
- [ ] File `src/components/funnels/FunnelDateRange.tsx` exists and exports `FunnelDateRange`
- [ ] File `src/components/FunnelChart.tsx` exists and exports `FunnelChart`
- [ ] File `src/app/funnels/page.tsx` contains `"use client"` and imports `useFunnels`
- [ ] HTTP check: GET `http://localhost:3000/funnels` contains `data-testid="step-builder"`
- [ ] HTTP check: GET `http://localhost:3000/funnels` contains `data-testid="funnel-date-range"`
- [ ] HTTP check: GET `http://localhost:3000/funnels` contains `data-testid="funnel-chart"`

## Test plan

- **Test file**: `src/components/funnels/__tests__/useFunnels.test.ts`
- **Module under test**: `useFunnels` hook
- **Cases to cover**:
  - Initial state has 2 empty steps, default date range (last 30 days), null result
  - `addStep` appends a step (up to 5 max)
  - `addStep` is a no-op when already at 5 steps
  - `removeStep` removes a step by index (minimum 2)
  - `removeStep` is a no-op when at 2 steps
  - `setStep` updates a step at a given index
  - Does not fetch funnel when fewer than 2 steps have non-empty values
  - Fetches funnel (POST /api/funnels) when all steps are non-empty and date range is set
  - Sets loading=true during fetch, loading=false after
  - Stores funnel response in result state on success
  - Sets error state on fetch failure

- **Test file**: `src/components/funnels/__tests__/StepBuilder.test.tsx`
- **Module under test**: `StepBuilder` component
- **Cases to cover**:
  - Renders correct number of Autocomplete inputs matching steps array length
  - Add Step button is present and calls `onAddStep` callback
  - Add Step button is disabled when steps.length === 5
  - Remove button is present for each step and calls `onRemoveStep(index)`
  - Remove buttons are disabled when steps.length === 2
  - Renders `data-testid="step-builder"` container

- **Test file**: `src/components/__tests__/FunnelChart.test.tsx`
- **Module under test**: `FunnelChart` component
- **Cases to cover**:
  - Renders loading skeleton when `loading=true`
  - Renders empty state when `steps` is empty array and `loading=false`
  - Renders `data-testid="funnel-chart"` container
  - Renders user count for each step
  - Renders conversion percentage annotations between steps
  - Renders drop-off text in red (checks for red color styling or a distinct testid)
  - Does not render chart when loading

- **Integration gap**: HTTP check — GET `/funnels` response containing `data-testid="step-builder"`, `data-testid="funnel-date-range"`, `data-testid="funnel-chart"` — requires dev server

## Risks and open questions

None. The backend API (F12) is fully built and tested. The frontend follows the same patterns established by the Trends page (F22/F23). Recharts `BarChart` with `layout="vertical"` provides native horizontal bar support.
