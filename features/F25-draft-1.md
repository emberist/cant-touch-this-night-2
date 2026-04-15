# F25 Sprint 1 — 2026-04-15

## Test files written

- `src/components/users/__tests__/useUserSearch.test.ts` — covers all 9 plan cases: initial fetch, users population, loading state (true/false), hasMore (true/false), loadMore appending + no-op guards, setQuery re-fetching with q param, cursor reset on query change, setQuery("") unfiltered fetch, debounce (rapid calls → single fetch)

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| Test suite 0 failures | ✅ | 400 passing, 25 skipped, 0 failing |
| Linter → `pnpm lint` exits 0 | ✅ | 7 warnings, all pre-existing in other files |
| Type check → `pnpm typecheck` exits 0 | ✅ | |
| Build → `pnpm build` exits 0 | ✅ | `/users` route listed as ○ (Static) |
| `src/components/users/useUserSearch.ts` exists and exports `useUserSearch` | ✅ | |
| `src/components/users/__tests__/useUserSearch.test.ts` exists | ✅ | |
| `src/app/users/page.tsx` contains `"use client"` and imports `useUserSearch` | ✅ | |
| HTTP check: `data-testid="users-search"` | ⚠️ | Integration gap — requires dev server (not started per instructions) |
| HTTP check: `data-testid="users-table"` | ⚠️ | Integration gap — requires dev server |

The two HTTP checks are marked as integration gaps in the plan. The `data-testid` attributes are present in the source:
- `users-search` is on the TextField's `htmlInput` slot (`slotProps={{ htmlInput: { "data-testid": "users-search" } }}`)
- `users-table` is on the `TableContainer` (`data-testid="users-table"`)

## Files created / modified

- `src/components/users/useUserSearch.ts` — new hook: state management (users, loading, hasMore, query, cursor), debounced `setQuery` (300ms), `loadMore`, initial mount fetch
- `src/components/users/__tests__/useUserSearch.test.ts` — 14 unit tests covering all plan cases
- `src/app/users/page.tsx` — replaced stub with full client component: MUI TextField search, MUI Table with IdentityChip, loading skeletons, empty state, IntersectionObserver infinite scroll, explicit Load More button fallback

## Implementation notes

**Debounce test strategy**: `vi.useFakeTimers()` with `waitFor` deadlocks because `@testing-library/react` v16's `waitFor` uses `setTimeout` internally for its polling interval. The fix: let the initial mount fetch complete using `waitFor` with real timers, then switch to fake timers (`{ toFake: ["setTimeout", "clearTimeout"] }`) only for debounce control, and use `await act(async () => { vi.advanceTimersByTime(400); })` to fire the debounce and flush the resulting async state updates without needing `waitFor`.

**MUI v9**: `inputProps` prop is removed — use `slotProps.htmlInput` for native HTML attributes on the underlying `<input>` element. `@mui/icons-material` is not installed; the search icon was omitted.

## Known gaps

None. All sprint contract criteria that can be verified without a dev server pass.

## Issues logged

None
