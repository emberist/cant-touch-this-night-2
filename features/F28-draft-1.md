# F28 Sprint 1 — 2026-04-15

## Test files written

- `src/components/test/__tests__/useLiveFeed.test.ts` — covers: initial state (empty events, disconnected, unpaused), EventSource lifecycle (URL, unmount cleanup), connection status transitions (open → live, error → disconnected), message prepend ordering, 200-event cap with oldest-drop, togglePause buffering, resume flush, clearEvents (state + buffer)
- `src/components/test/__tests__/LiveFeed.test.tsx` — covers: connection status text ("Live"/"Disconnected"), Pause/Resume/Clear buttons rendered, empty state ("No events yet"), event cards (event name chip, resolved identity), Pause → Resume toggle via re-render, Clear calls clearEvents

## Sprint contract results

| Criterion | Result | Notes |
| --------------------------------- | ------- | ---------------------------------------------------- |
| test suite 0 failures | ✅ | 478 passing, 0 failing, 25 skipped (pre-existing) |
| lint exit 0 | ✅ | 17 warnings (10 new `noNonNullAssertion` in test file, 7 pre-existing); exit 0 |
| typecheck exit 0 | ✅ | `tsc --noEmit` clean |
| build exit 0 | ✅ | `next build` succeeds; /test is static |
| `src/components/test/useLiveFeed.ts` exists + exports `useLiveFeed` | ✅ | |
| `src/components/test/LiveFeed.tsx` exists + exports `LiveFeed` | ✅ | |
| `src/components/test/__tests__/useLiveFeed.test.ts` exists | ✅ | |
| `src/components/test/__tests__/LiveFeed.test.tsx` exists | ✅ | |
| GET `/test` contains `Live` | ✅ | "Live Feed" heading rendered server-side |
| GET `/test` contains `Pause` | ✅ | Pause button in initial (unpaused) SSR output |
| GET `/test` contains `Clear` | ✅ | Clear button always rendered |

## Files created / modified

- `src/components/test/__tests__/useLiveFeed.test.ts` — new; 13 test cases for the hook
- `src/components/test/__tests__/LiveFeed.test.tsx` — new; 13 test cases for the component (mocks `useLiveFeed` and `next/link`)
- `src/components/test/useLiveFeed.ts` — new; custom hook: EventSource lifecycle, pause/resume buffering with `pausedRef` to avoid stale closures, 200-event cap, clearEvents also clears the buffer ref
- `src/components/test/LiveFeed.tsx` — new; renders connection status dot + text, Pause/Resume and Clear toolbar, empty state, event cards with colored Chip, IdentityChip, relative timestamp, JsonChip
- `src/app/test/page.tsx` — modified; replaced placeholder right-panel content with `<LiveFeed />`

## Known gaps

- The 10 new `noNonNullAssertion` lint warnings in `useLiveFeed.test.ts` (lines accessing `MockEventSource.lastInstance!`) are warnings only (exit 0). In each case, a preceding `not.toBeNull()` assertion makes the `!` correct. The safe fix would be to use a typed getter helper, but since these are warnings and not errors, and the instructions say not to modify tests unless there's a clear factual error, they are left as-is.

## Issues logged

None
