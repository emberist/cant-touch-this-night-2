# F31 Plan

## Acceptance criteria

From SPEC §7.7 — Bulk Generator Page (`/generate`):

- Single-page form with a progress panel that appears once generation starts.
- **Configuration form** with fields:
  - Total events: Number input, default 10,000, min 1, max 1,000,000
  - Number of users: Number input, default 100
  - Date range: Date range picker, default last 30 days
  - Event mix: Checkboxes + weight sliders — select which event types to include and their relative frequency
  - Identity resolution: Toggle, default On
  - Anonymous ratio: Slider (0–100%), default 30%
  - Numeric property variance: Slider (Low / Medium / High), default Medium
- **Preset templates** (one-click populate the form):
  - "Realistic (10k events, 30 days)"
  - "High volume (100k events, 90 days)"
  - "Stress test (1M events, 365 days)"
- **Progress panel** (shown during/after generation):
  - Progress bar: "X / 1,000,000 events inserted (Y%)"
  - Estimated time remaining (derived from current throughput)
  - Throughput meter: "~142,000 events/sec"
  - Status: Queued / Running / Complete / Failed
  - On complete: links to `/explore` and `/trends` to immediately explore generated data
  - Cancel button: sends `POST /api/generate/[job_id]/cancel`

## Dependencies

Built on F29 (POST /api/generate/start) and F30 (GET /api/generate/[job_id]/status SSE, POST cancel, GET /api/generate/jobs).

Files that will be imported or extended:
- `src/lib/generator.ts` — `JobConfigInput`, `EventTypeWeight`, `NumericVariance`, `JobState`, `JobStatus` types
- `src/app/api/generate/start/route.ts` — consumed via `POST /api/generate/start`
- `src/app/api/generate/[job_id]/status/route.ts` — consumed via SSE `GET /api/generate/[job_id]/status`
- `src/app/api/generate/[job_id]/cancel/route.ts` — consumed via `POST /api/generate/[job_id]/cancel`
- `src/app/api/generate/jobs/route.ts` — consumed via `GET /api/generate/jobs`

## Files to create or modify

- CREATE `src/components/generate/useGenerator.ts` — hook managing form state, presets, job submission, SSE progress subscription, and cancellation
- CREATE `src/components/generate/GeneratorForm.tsx` — config form with all fields and preset template buttons
- CREATE `src/components/generate/ProgressPanel.tsx` — progress bar, throughput, ETA, status, cancel, completion links
- CREATE `src/components/generate/JobList.tsx` — lists recent generation jobs with status and row counts
- CREATE `src/components/generate/__tests__/useGenerator.test.ts` — unit tests for the hook
- CREATE `src/components/generate/__tests__/GeneratorForm.test.tsx` — unit tests for the form component
- CREATE `src/components/generate/__tests__/ProgressPanel.test.tsx` — unit tests for the progress panel
- MODIFY `src/app/generate/page.tsx` — replace placeholder with composed GeneratorForm + ProgressPanel + JobList

## Implementation order

1. **Create `src/components/generate/useGenerator.ts`** — hook that manages:
   - Form state (all config fields with defaults matching spec)
   - Preset template application (Realistic / High volume / Stress test) that populate form fields
   - `startJob()`: POST to `/api/generate/start` with form state, receive `job_id`, open SSE to `/api/generate/[job_id]/status` and track progress (inserted, total, throughput, eta_seconds, status, elapsed_ms)
   - `cancelJob()`: POST to `/api/generate/[job_id]/cancel`
   - `fetchJobs()`: GET `/api/generate/jobs`
   - SSE cleanup on unmount

2. **Create `src/components/generate/__tests__/useGenerator.test.ts`** — tests for the hook (form defaults, preset application, startJob fetch calls, SSE parsing, cancelJob, error handling)

3. **Create `src/components/generate/GeneratorForm.tsx`** — MUI form component:
   - Number inputs for total events and users (with min/max from spec)
   - Date inputs for start/end
   - Event type checkboxes with weight sliders (MUI Slider)
   - Identity resolution Switch + Anonymous ratio Slider (disabled when identity off)
   - Numeric variance slider (Low/Medium/High)
   - Three preset template Chips/Buttons
   - "Generate" submit button (disabled while a job is running)

4. **Create `src/components/generate/__tests__/GeneratorForm.test.tsx`** — tests for form rendering and preset buttons

5. **Create `src/components/generate/ProgressPanel.tsx`** — MUI component:
   - LinearProgress bar with label "X / Y events inserted (Z%)"
   - Throughput display
   - ETA display
   - Status chip (Queued/Running/Complete/Failed/Cancelled)
   - Cancel button (shown during queued/running)
   - Completion links to `/explore` and `/trends` (shown when complete)

6. **Create `src/components/generate/__tests__/ProgressPanel.test.tsx`** — tests for progress display, cancel button visibility, completion links

7. **Create `src/components/generate/JobList.tsx`** — MUI component showing recent jobs in a compact list/table (job_id, status, inserted/total, created_at)

8. **Modify `src/app/generate/page.tsx`** — compose `GeneratorForm`, `ProgressPanel`, and `JobList` using `useGenerator` hook. Single-page layout with form at top, progress panel appearing below when a job is active, and job history at the bottom.

## Sprint contract

- [ ] `pnpm test` → 0 failures
- [ ] `pnpm lint` → exit 0
- [ ] `pnpm typecheck` → exit 0
- [ ] `pnpm build` → exit 0
- [ ] File `src/components/generate/useGenerator.ts` exists and exports `useGenerator`
- [ ] File `src/components/generate/GeneratorForm.tsx` exists and exports `GeneratorForm`
- [ ] File `src/components/generate/ProgressPanel.tsx` exists and exports `ProgressPanel`
- [ ] File `src/components/generate/JobList.tsx` exists and exports `JobList`
- [ ] File `src/components/generate/__tests__/useGenerator.test.ts` exists
- [ ] File `src/components/generate/__tests__/GeneratorForm.test.tsx` exists
- [ ] File `src/components/generate/__tests__/ProgressPanel.test.tsx` exists
- [ ] HTTP check: GET `http://localhost:3000/generate` contains `Generate`
- [ ] HTTP check: GET `http://localhost:3000/generate` contains `Realistic`
- [ ] HTTP check: GET `http://localhost:3000/generate` contains `Total events`

## Test plan

- **Test file**: `src/components/generate/__tests__/useGenerator.test.ts`
- **Module under test**: `useGenerator` hook from `src/components/generate/useGenerator.ts`
- **Cases to cover**:
  - Initial form state matches spec defaults (total: 10000, users: 100, identity_resolution: true, anonymous_ratio: 30, numeric_variance: "medium", 6 default event types with correct weights)
  - `applyPreset("realistic")` sets total=10000, users=100, date range=last 30 days
  - `applyPreset("high-volume")` sets total=100000, date range=last 90 days
  - `applyPreset("stress-test")` sets total=1000000, date range=last 365 days
  - `startJob()` calls `POST /api/generate/start` with correct body derived from form state and returns job_id
  - `startJob()` sets `jobActive` to true and opens SSE connection to `/api/generate/[job_id]/status`
  - SSE progress messages update `progress` state (inserted, total, throughput, eta_seconds, status)
  - SSE terminal status ("complete"/"failed"/"cancelled") sets `jobActive` to false
  - `cancelJob()` calls `POST /api/generate/[job_id]/cancel`
  - `startJob()` returns error state when POST fails
  - Toggling identity_resolution off resets anonymous_ratio to 0

- **Test file**: `src/components/generate/__tests__/GeneratorForm.test.tsx`
- **Module under test**: `GeneratorForm` component from `src/components/generate/GeneratorForm.tsx`
- **Cases to cover**:
  - Renders all form fields (total events input, users input, date pickers, event type checkboxes, identity switch, anonymous slider, variance slider)
  - Renders three preset buttons with correct labels
  - Clicking a preset button calls the corresponding `applyPreset` callback
  - Submit button calls `onSubmit` callback
  - Submit button is disabled when `disabled` prop is true (job running)
  - Anonymous ratio slider is disabled when identity resolution is off

- **Test file**: `src/components/generate/__tests__/ProgressPanel.test.tsx`
- **Module under test**: `ProgressPanel` component from `src/components/generate/ProgressPanel.tsx`
- **Cases to cover**:
  - Renders progress bar with correct percentage (inserted/total)
  - Displays throughput and ETA text
  - Shows status chip with correct label
  - Cancel button is visible and calls `onCancel` when status is "running"
  - Cancel button is hidden when status is "complete" or "failed"
  - Completion links to `/explore` and `/trends` are shown when status is "complete"
  - Completion links are hidden when status is "running"

- **Integration gap**: HTTP checks for GET `/generate` page content — requires dev server

## Risks and open questions

- **Event mix weight sliders UI complexity**: The spec says "checkboxes + weight sliders" per event type. With 6 event types this is a moderately complex form section. Using MUI Slider components with labels should keep it manageable. Weights don't need to sum to 1.0 — the server normalizes them via cumulative weighting in `generateBatchEvents`.
- **SSE cleanup**: The hook must close the `EventSource` on unmount and on job completion to avoid memory leaks. This is straightforward with a `useEffect` cleanup return.
