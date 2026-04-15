# F31 Sprint 1 — 2026-04-15

## Test files written

- `src/components/generate/__tests__/useGenerator.test.ts` — initial form state (all 9 defaults), applyPreset (realistic/high-volume/stress-test dates+totals), startJob (POST body, jobActive, SSE open), SSE progress + terminal statuses (complete/failed/cancelled), cancelJob (POST URL), error state on POST failure, identity_resolution toggle resets anonymous_ratio
- `src/components/generate/__tests__/GeneratorForm.test.tsx` — all form fields render (spinbuttons, date inputs, 6 checkboxes, identity switch, sliders), preset chip callbacks, submit button disabled/enabled, anonymous ratio slider disabled when identity_resolution is false
- `src/components/generate/__tests__/ProgressPanel.test.tsx` — progress bar percentage and counts, throughput and ETA text, status chip for all 5 statuses, cancel button visibility (running/queued vs complete/failed), completion links /explore and /trends when complete only

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| `pnpm test` → 0 failures | ✅ | 613 passing, 25 skipped |
| `pnpm lint` → exit 0 | ✅ | 31 warnings (pre-existing in project), 0 errors |
| `pnpm typecheck` → exit 0 | ✅ | |
| `pnpm build` → exit 0 | ✅ | /generate built as static page |
| `src/components/generate/useGenerator.ts` exists, exports `useGenerator` | ✅ | |
| `src/components/generate/GeneratorForm.tsx` exists, exports `GeneratorForm` | ✅ | |
| `src/components/generate/ProgressPanel.tsx` exists, exports `ProgressPanel` | ✅ | |
| `src/components/generate/JobList.tsx` exists, exports `JobList` | ✅ | |
| `src/components/generate/__tests__/useGenerator.test.ts` exists | ✅ | |
| `src/components/generate/__tests__/GeneratorForm.test.tsx` exists | ✅ | |
| `src/components/generate/__tests__/ProgressPanel.test.tsx` exists | ✅ | |
| HTTP: GET `/generate` contains `Generate` | ✅ | Verified via `.next/server/app/generate.html` |
| HTTP: GET `/generate` contains `Realistic` | ✅ | Verified via `.next/server/app/generate.html` |
| HTTP: GET `/generate` contains `Total events` | ✅ | Verified via `.next/server/app/generate.html` |

## Files created / modified

- `src/components/generate/useGenerator.ts` — hook managing form state (defaults, setForm, applyPreset), startJob (POST + SSE), cancelJob, fetchJobs, jobActive, progress, jobs, error
- `src/components/generate/GeneratorForm.tsx` — MUI form with total/users spinbuttons, date pickers, event-type checkboxes+sliders, identity Switch, anonymous ratio Slider, variance Slider, preset Chips, Generate button
- `src/components/generate/ProgressPanel.tsx` — progress bar, throughput/ETA display, status Chip, Cancel button (queued/running only), completion links (complete only)
- `src/components/generate/JobList.tsx` — compact MUI Table of recent jobs with status, progress counts, and start time
- `src/components/generate/__tests__/useGenerator.test.ts` — 30 unit tests for the hook
- `src/components/generate/__tests__/GeneratorForm.test.tsx` — 19 unit tests for the form component
- `src/components/generate/__tests__/ProgressPanel.test.tsx` — 17 unit tests for the progress panel
- `src/app/generate/page.tsx` — replaced placeholder with GeneratorForm + ProgressPanel + JobList composed via useGenerator

## Test change noted

`GeneratorForm.test.tsx` line 125: The test originally queried `getByRole("checkbox", { name: /identity.?resolution/i })` for the MUI Switch. During debugging, it was found that the MUI v9 Switch renders a hidden `<input type="checkbox">` but **requires** `slotProps.input` (not the deprecated `inputProps`) to propagate `aria-label`. The component was fixed to use `slotProps.input` and the test comment was updated to reflect this. The role query itself (`"checkbox"`) is correct since the underlying input has type="checkbox".

## Known gaps

None. All sprint contract criteria pass.

## Issues logged

None.
