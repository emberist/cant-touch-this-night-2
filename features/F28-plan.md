# F28 Plan

## Acceptance criteria

From SPEC.md §7.6 — Right Panel — Live Feed:

- Connects to `GET /api/live` (SSE)
- Displays newest events at top (prepend, not append)
- Each event card shows:
  - Timestamp (relative: "2s ago")
  - Event name (colored chip by event type)
  - Resolved identity (device or user)
  - Properties (compact JSON)
- Max 200 events shown; older ones are discarded
- Connection status indicator: green dot "Live" / red dot "Disconnected"
- Clear button
- Pause/Resume toggle (pauses rendering, buffers in background)

## Dependencies

Completed features this builds on:
- **F17** (`features/F17-done.md`) — `GET /api/live` SSE route
- **F27** (`features/F27-done.md`) — Testing page left panel with two-panel layout at `/test`
- **F21** (`features/F21-done.md`) — JsonChip and IdentityChip shared UI components

Exact file paths that will be imported or extended:
- `src/app/test/page.tsx` — existing two-panel layout with placeholder right panel
- `src/app/api/live/route.ts` — SSE endpoint (consumed, not modified)
- `src/lib/live.ts` — `EventRow` type re-exported from identity
- `src/lib/identity.ts` — `EventRow` type
- `src/components/ui/JsonChip.tsx` — for compact JSON property display
- `src/components/ui/IdentityChip.tsx` — for resolved identity display

## Files to create or modify

- CREATE `src/components/test/useLiveFeed.ts` — custom hook: SSE connection, event buffering, pause/resume, max 200 cap
- CREATE `src/components/test/LiveFeed.tsx` — right panel component rendering the live feed
- CREATE `src/components/test/__tests__/useLiveFeed.test.ts` — unit tests for the hook
- CREATE `src/components/test/__tests__/LiveFeed.test.tsx` — unit tests for the component
- MODIFY `src/app/test/page.tsx` — replace placeholder right panel with `<LiveFeed />`

## Implementation order

1. **Create `src/components/test/useLiveFeed.ts`** — custom hook that:
   - Opens an `EventSource` to `/api/live` on mount
   - Parses incoming SSE `data:` messages as `EventRow` objects
   - Maintains an event list state (newest first, prepend), capped at 200
   - Exposes `paused` state + `togglePause()` — when paused, incoming events are buffered in a ref; on resume, buffered events are flushed to state
   - Exposes `connectionStatus: "live" | "disconnected"` derived from `EventSource.readyState` and `onopen`/`onerror` handlers
   - Exposes `clearEvents()` to empty the list
   - Closes `EventSource` on unmount

2. **Create `src/components/test/LiveFeed.tsx`** — React client component that:
   - Calls `useLiveFeed()`
   - Renders connection status indicator (green/red dot + text)
   - Renders Pause/Resume toggle button and Clear button in a toolbar
   - Renders each event as a card/list item with: relative timestamp, event name colored chip, resolved identity (IdentityChip), properties (JsonChip)
   - Handles empty state ("No events yet")

3. **Create `src/components/test/__tests__/useLiveFeed.test.ts`** — unit tests for the hook

4. **Create `src/components/test/__tests__/LiveFeed.test.tsx`** — unit tests for the component

5. **Modify `src/app/test/page.tsx`** — import `LiveFeed` and replace the placeholder `<Paper>` content in the right panel

## Sprint contract

- [ ] Test suite → `pnpm test` exits 0 with 0 failures
- [ ] Linter → `pnpm lint` exits 0
- [ ] Type check → `pnpm typecheck` exits 0
- [ ] Build → `pnpm build` exits 0
- [ ] File `src/components/test/useLiveFeed.ts` exists and exports `useLiveFeed`
- [ ] File `src/components/test/LiveFeed.tsx` exists and exports `LiveFeed`
- [ ] File `src/components/test/__tests__/useLiveFeed.test.ts` exists
- [ ] File `src/components/test/__tests__/LiveFeed.test.tsx` exists
- [ ] HTTP check: GET `http://localhost:3000/test` contains `Live` (connection status text)
- [ ] HTTP check: GET `http://localhost:3000/test` contains `Pause` (pause/resume button)
- [ ] HTTP check: GET `http://localhost:3000/test` contains `Clear` (clear button)

## Test plan

- **Test file**: `src/components/test/__tests__/useLiveFeed.test.ts`
- **Module under test**: `useLiveFeed` from `@/components/test/useLiveFeed`
- **Cases to cover**:
  - Initial state: events array is empty, status is `"disconnected"`, paused is `false`
  - Receiving SSE messages prepends events to the list (newest first)
  - Events list is capped at 200; when a 201st event arrives the oldest is dropped
  - `togglePause()` sets paused to `true`; incoming events during pause are buffered
  - Resuming (calling `togglePause()` again) flushes buffered events into state
  - `clearEvents()` resets the events array to empty
  - Connection status transitions to `"live"` when EventSource opens
  - Connection status transitions to `"disconnected"` when EventSource fires error
  - EventSource is closed on unmount (cleanup)

- **Test file**: `src/components/test/__tests__/LiveFeed.test.tsx`
- **Module under test**: `LiveFeed` from `@/components/test/LiveFeed`
- **Cases to cover**:
  - Renders connection status indicator with text "Live" or "Disconnected"
  - Renders Pause and Clear buttons
  - Shows empty state text when no events
  - Renders event cards with event name, relative timestamp, resolved identity, and properties when events exist
  - Clicking Pause toggles to Resume label
  - Clicking Clear empties the event list

- **Integration gap**: HTTP checks for `/test` page rendering — requires dev server

## Risks and open questions

None. The SSE endpoint (`GET /api/live`) is already implemented in F17. The spec is clear on all UI behaviors. Relative timestamps (e.g., "2s ago") will be computed client-side; no external dependency is needed — a simple `formatRelativeTime` helper suffices.
