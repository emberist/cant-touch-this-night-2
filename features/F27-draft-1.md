# F27 Sprint 1 — 2026-04-15

## Test files written

- `src/components/test/__tests__/useEventSender.test.ts` — covers: initial state (lastDeviceId null, loading false), sendEvent fetch call shape, success/error return values on 200/400/409/500, lastDeviceId tracking (updated / not updated), sendSeed calls POST /api/seed and returns eventCount, sendSeed error handling, loading flag true during in-flight / false after completion
- `src/components/test/__tests__/QuickFireButtons.test.tsx` — covers: data-testid container, all 5 buttons rendered, correct payloads per button (Page Viewed + device_id + page, Button Clicked + same device_id, Identify User + device_id + user_id, Purchase Completed + amount/currency, Signup Completed + new random ids), feedback display on success/error
- `src/components/test/__tests__/CustomEventForm.test.tsx` — covers: data-testid container, collapsible toggle (open/close/reclose), submit disabled when event_name empty, enabled when filled, calls sendEvent with event_name / device_id / user_id / properties, invalid JSON shows validation error, success/error feedback display
- `src/components/test/__tests__/SeedDataButton.test.tsx` — covers: data-testid container, click calls sendSeed, button disabled while loading / re-enabled after, event count displayed on success, error message on failure

## Sprint contract results

| Criterion | Result | Notes |
|---|---|---|
| `pnpm typecheck` exits 0 | ✅ | Clean, no errors |
| `pnpm lint` exits 0 | ✅ | 7 pre-existing warnings (seed.test.ts `any` warning); 0 in new files |
| `pnpm build` exits 0 | ✅ | `/test` built as static page |
| `pnpm test` exits with 0 failures | ✅ | 454 passing, 25 skipped |
| `src/components/test/useEventSender.ts` exports `useEventSender` | ✅ | |
| `src/components/test/QuickFireButtons.tsx` exports `QuickFireButtons` | ✅ | |
| `src/components/test/CustomEventForm.tsx` exports `CustomEventForm` | ✅ | |
| `src/components/test/SeedDataButton.tsx` exports `SeedDataButton` | ✅ | |
| `src/app/test/page.tsx` imports from `@/components/test/QuickFireButtons` | ✅ | |
| `src/app/test/page.tsx` imports from `@/components/test/CustomEventForm` | ✅ | |
| `src/app/test/page.tsx` imports from `@/components/test/SeedDataButton` | ✅ | |
| HTTP: `/test` contains `data-testid="quick-fire-buttons"` | ✅ | Verified via `next start` + curl |
| HTTP: `/test` contains `data-testid="custom-event-form"` | ✅ | |
| HTTP: `/test` contains `data-testid="seed-data-button"` | ✅ | |

## Files created / modified

- `src/components/test/useEventSender.ts` — new hook exporting `useEventSender`, `generateId`, `EventPayload`, `SendResult`, `SeedResult` types
- `src/components/test/QuickFireButtons.tsx` — 5 quick-fire buttons using `useEventSender` hook internally; tracks `lastDeviceId` for anonymous→identify flow
- `src/components/test/CustomEventForm.tsx` — collapsible form accepting `sendEvent` prop; fields: event_name, device_id, user_id, timestamp, properties (textarea); JSON validation inline
- `src/components/test/SeedDataButton.tsx` — seed trigger accepting `sendSeed` prop; shows loading state and event count / error after completion
- `src/app/test/page.tsx` — replaced stub; two-panel layout (left: event sender, right: "Live Feed coming soon" placeholder); uses `useEventSender` at page level for CustomEventForm and SeedDataButton props
- `src/components/test/__tests__/useEventSender.test.ts` — new (26 test cases)
- `src/components/test/__tests__/QuickFireButtons.test.tsx` — new (10 test cases)
- `src/components/test/__tests__/CustomEventForm.test.tsx` — new (12 test cases)
- `src/components/test/__tests__/SeedDataButton.test.tsx` — new (5 test cases)

## Design decisions

- **QuickFireButtons uses `useEventSender` internally** — it owns `lastDeviceId` state to share device_id across the anonymous→button click→identify flow within the same component.
- **CustomEventForm and SeedDataButton accept callback props** — decoupled from the hook for clean testability; page.tsx wires them to a separate `useEventSender` instance.
- **Conditional render for collapsible form** — uses `{open && <FormFields />}` rather than MUI Collapse to ensure form elements are absent from the accessibility tree when closed (required for `queryByRole` to return null in tests).
- **`vi.fn<FunctionType>()` syntax** — Vitest 4.x changed from `vi.fn<[Args], Return>()` to `vi.fn<FnType>()`. Tests fixed accordingly.
- **`slotProps.htmlInput` not `inputProps`** — MUI v9 removed `inputProps`; replaced with `slotProps={{ htmlInput: { ... } }}`.

## Issues logged

None — ISSUES.md not created.

## Known gaps

None. All sprint contract criteria pass.
