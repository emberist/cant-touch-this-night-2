# F27 Plan

## Acceptance criteria

From SPEC.md §7.6 — Testing Page (`/test`), Left Panel:

### Layout
- Two-panel layout: **Left panel — Event Sender** (controls to fire events), **Right panel — Live Feed** (real-time stream of incoming events)

### Left Panel — Event Sender

**Quick-fire buttons** (pre-configured payloads, one click to send):

| Button | Event Name | Payload |
|---|---|---|
| Anonymous Page View | `Page Viewed` | random device_id, `{ page: "/home" }` |
| Button Click | `Button Clicked` | same device_id as last anonymous, `{ button_name: "Get Started" }` |
| Identify User | _(identity link)_ | same device_id + `user_id: "test@example.com"` |
| Purchase | `Purchase Completed` | `user_id: "test@example.com"`, `{ amount: 49.99, currency: "USD" }` |
| Signup | `Signup Completed` | new random device_id, new random user_id |
| Custom Event | _(form)_ | manual fields |

**Custom Event Form** (collapsible):
- `event_name` text input
- `device_id` text input (optional)
- `user_id` text input (optional)
- `timestamp` datetime input (optional)
- `properties` JSON textarea with syntax highlighting (CodeMirror or simple `<textarea>`)
- Submit button

After each send, show inline success/error toast under the button.

**Seed Data button**: calls `POST /api/seed` with a loading indicator. Shows event count after completion.

## Dependencies

Completed features this builds on:
- F5 (`POST /api/events` route) — `src/app/api/events/route.ts`
- F4 (identity resolution) — `src/lib/identity.ts`
- F16 (seed route) — `src/app/api/seed/route.ts`, `src/app/api/seed/status/route.ts`
- F17 (live SSE route) — `src/app/api/live/route.ts` (will be used by the right panel, but this feature only builds the left panel)
- F18 (navigation shell) — `src/components/Sidebar.tsx`, `src/app/layout.tsx`

Existing files that will be imported or extended:
- `src/app/test/page.tsx` (currently a stub — will be replaced)
- `POST /api/events` at `src/app/api/events/route.ts` (consumed, not modified)
- `POST /api/seed` at `src/app/api/seed/route.ts` (consumed, not modified)
- `GET /api/seed/status` at `src/app/api/seed/status/route.ts` (consumed, not modified)

## Files to create or modify

- CREATE `src/components/test/QuickFireButtons.tsx` — Quick-fire button grid with pre-configured payloads
- CREATE `src/components/test/CustomEventForm.tsx` — Collapsible custom event form
- CREATE `src/components/test/SeedDataButton.tsx` — Seed data trigger with loading state and event count display
- CREATE `src/components/test/useEventSender.ts` — Hook encapsulating event sending logic, device_id tracking, toast state
- CREATE `src/components/test/__tests__/useEventSender.test.ts` — Unit tests for the hook
- CREATE `src/components/test/__tests__/QuickFireButtons.test.tsx` — Component tests for quick-fire buttons
- CREATE `src/components/test/__tests__/CustomEventForm.test.tsx` — Component tests for custom event form
- CREATE `src/components/test/__tests__/SeedDataButton.test.tsx` — Component tests for seed data button
- MODIFY `src/app/test/page.tsx` — Replace stub with two-panel layout composing left panel components (right panel placeholder for future F28)

## Implementation order

1. **Create `src/components/test/useEventSender.ts`** — Custom hook that:
   - Tracks `lastDeviceId` in state (for Anonymous Page View → Button Click → Identify flow)
   - Exposes `sendEvent(payload)` that POSTs to `/api/events` and returns success/error
   - Exposes `sendSeed()` that POSTs to `/api/seed` then GETs `/api/seed/status`
   - Manages per-button toast/feedback state (success message, error message, loading)
   - Generates random device_id and user_id values for quick-fire buttons

2. **Create `src/components/test/__tests__/useEventSender.test.ts`** — Unit tests for the hook

3. **Create `src/components/test/QuickFireButtons.tsx`** — Renders the 5 quick-fire buttons (Anonymous Page View, Button Click, Identify User, Purchase, Signup). Each button calls `sendEvent` from the hook with the correct payload. Shows inline success/error feedback after each send.

4. **Create `src/components/test/__tests__/QuickFireButtons.test.tsx`** — Component tests

5. **Create `src/components/test/CustomEventForm.tsx`** — Collapsible form with event_name, device_id, user_id, timestamp, and properties (textarea) fields. Submit button calls `sendEvent`. Shows inline success/error feedback.

6. **Create `src/components/test/__tests__/CustomEventForm.test.tsx`** — Component tests

7. **Create `src/components/test/SeedDataButton.tsx`** — Button that calls `POST /api/seed`, shows loading spinner, then displays event count from seed result or `/api/seed/status`.

8. **Create `src/components/test/__tests__/SeedDataButton.test.tsx`** — Component tests

9. **Modify `src/app/test/page.tsx`** — Replace stub with two-panel layout. Left panel renders QuickFireButtons, CustomEventForm, and SeedDataButton. Right panel renders a placeholder (e.g., `<Typography>Live Feed coming soon</Typography>`) for the future live feed feature.

## Sprint contract

- [ ] Type check: `pnpm typecheck` exits 0
- [ ] Lint: `pnpm lint` exits 0
- [ ] Build: `pnpm build` exits 0
- [ ] Test suite: `pnpm test` exits with 0 failures
- [ ] File `src/components/test/useEventSender.ts` exists and exports `useEventSender`
- [ ] File `src/components/test/QuickFireButtons.tsx` exists and exports `QuickFireButtons`
- [ ] File `src/components/test/CustomEventForm.tsx` exists and exports `CustomEventForm`
- [ ] File `src/components/test/SeedDataButton.tsx` exists and exports `SeedDataButton`
- [ ] File `src/app/test/page.tsx` exists and imports from `@/components/test/QuickFireButtons`
- [ ] File `src/app/test/page.tsx` imports from `@/components/test/CustomEventForm`
- [ ] File `src/app/test/page.tsx` imports from `@/components/test/SeedDataButton`
- [ ] HTTP check: GET `http://localhost:3000/test` contains `data-testid="quick-fire-buttons"`
- [ ] HTTP check: GET `http://localhost:3000/test` contains `data-testid="custom-event-form"`
- [ ] HTTP check: GET `http://localhost:3000/test` contains `data-testid="seed-data-button"`

## Test plan

- **Test file**: `src/components/test/__tests__/useEventSender.test.ts`
- **Module under test**: `useEventSender` hook from `@/components/test/useEventSender`
- **Cases to cover**:
  - `sendEvent` calls `fetch` with `POST /api/events` and correct JSON body
  - `sendEvent` returns success state on 201 response
  - `sendEvent` returns error message on 400/409/500 responses
  - `lastDeviceId` is updated after sending an Anonymous Page View event
  - `sendSeed` calls `POST /api/seed` and returns event count on success
  - `sendSeed` returns error message on failure
  - Loading state is true during in-flight requests, false after completion

- **Test file**: `src/components/test/__tests__/QuickFireButtons.test.tsx`
- **Module under test**: `QuickFireButtons` component from `@/components/test/QuickFireButtons`
- **Cases to cover**:
  - Renders `data-testid="quick-fire-buttons"` container
  - Renders all 5 quick-fire buttons (Anonymous Page View, Button Click, Identify User, Purchase, Signup)
  - Clicking "Anonymous Page View" calls `sendEvent` with `event_name: "Page Viewed"`, a device_id, and `{ page: "/home" }` properties
  - Clicking "Button Click" calls `sendEvent` with `event_name: "Button Clicked"` and same device_id as last anonymous event
  - Clicking "Identify User" calls `sendEvent` with both device_id and user_id
  - Clicking "Purchase" calls `sendEvent` with user_id and `{ amount: 49.99, currency: "USD" }`
  - Clicking "Signup" calls `sendEvent` with new random device_id and user_id
  - Success/error feedback is displayed after a send completes

- **Test file**: `src/components/test/__tests__/CustomEventForm.test.tsx`
- **Module under test**: `CustomEventForm` component from `@/components/test/CustomEventForm`
- **Cases to cover**:
  - Renders `data-testid="custom-event-form"` container
  - Form is collapsible (toggle open/closed)
  - Submit button is disabled when `event_name` is empty
  - Submitting with valid event_name calls `sendEvent` with correct payload
  - Optional fields (device_id, user_id, timestamp, properties) are included in payload when filled
  - Invalid JSON in properties textarea shows validation error
  - Success/error feedback is displayed after submit

- **Test file**: `src/components/test/__tests__/SeedDataButton.test.tsx`
- **Module under test**: `SeedDataButton` component from `@/components/test/SeedDataButton`
- **Cases to cover**:
  - Renders `data-testid="seed-data-button"` container
  - Clicking the button calls `POST /api/seed`
  - Shows loading indicator while seed is in progress
  - Displays event count on successful completion
  - Shows error message on failure

- **Integration gap**: HTTP checks for `/test` page rendering — requires dev server

## Risks and open questions

1. **device_id persistence across quick-fire buttons**: The spec says "Button Click" uses "same device_id as last anonymous" and "Identify User" uses "same device_id". The `useEventSender` hook must track the last generated device_id in React state. If the user refreshes the page, this tracking resets — acceptable since this is a developer testing tool.
2. **Properties textarea vs CodeMirror**: The spec mentions "syntax highlighting (CodeMirror or simple `<textarea>`)". Using a plain `<textarea>` with monospace font to avoid adding a CodeMirror dependency. The spec explicitly permits this.
3. **Right panel placeholder**: This feature only builds the left panel. The right panel (Live Feed) will be built in a subsequent feature. A placeholder is rendered to maintain the two-panel layout structure.
