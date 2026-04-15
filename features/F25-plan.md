# F25 Plan

## Acceptance criteria

From SPEC §7.5 (User Profiles — `/users`):

- Search input → calls `/api/users?q=...`
- Results list → click opens `/users/[id]`

From SPEC §6.6 (`GET /api/users`):

- Query params: `q` (search string), `limit`, `cursor`
- Returns paginated list of users with `resolved_id`, `first_seen`, `last_seen`, `event_count`

## Dependencies

Completed features this builds on:

- **F13** (`GET /api/users` route) — `src/lib/users.ts` exports `searchUsers`, `UserListItem`, `UserSearchResult`; `src/app/api/users/route.ts` exposes the HTTP endpoint
- **F14** (`GET /api/users/[id]` route) — `src/app/api/users/[id]/route.ts` (navigation target)
- **F18** (Navigation shell) — `src/components/Sidebar.tsx` already has "Users" link to `/users`
- **F21** (Shared UI components) — `src/components/ui/IdentityChip.tsx` for resolved_id display with link

Existing files that will be imported or extended:

- `src/app/users/page.tsx` — current stub, will be replaced
- `src/lib/users.ts` — types `UserListItem`, `UserSearchResult` (used for type reference)
- `src/components/ui/IdentityChip.tsx` — renders resolved_id as clickable chip linking to `/users/[id]`

## Files to create or modify

- CREATE `src/components/users/useUserSearch.ts` — custom hook managing search query, API calls, cursor pagination, loading state
- CREATE `src/components/users/__tests__/useUserSearch.test.ts` — unit tests for the hook
- MODIFY `src/app/users/page.tsx` — replace stub with full search page (client component with search input, results table, cursor-based load-more)

## Implementation order

1. **Create `src/components/users/useUserSearch.ts`** — custom hook that:
   - Maintains state: `query` (string), `users` (array), `loading` (boolean), `hasMore` (boolean), `cursor` (string | null)
   - Exposes `setQuery(q: string)` — debounces input (300ms), resets results, fetches first page from `/api/users?q=...&limit=50`
   - Exposes `loadMore()` — fetches next page using cursor, appends to results
   - Fetches initial page on mount (no query filter)
   - Follows the same pattern as `src/components/explore/useEventExplorer.ts`

2. **Create `src/components/users/__tests__/useUserSearch.test.ts`** — unit tests for the hook (see Test Plan below)

3. **Modify `src/app/users/page.tsx`** — replace stub with full client component:
   - `"use client"` directive
   - MUI `TextField` with search icon for query input (controlled, calls `setQuery` on change)
   - MUI `Table` displaying results: columns for Resolved Identity (using `IdentityChip`), First Seen, Last Seen, Event Count
   - Clicking any row navigates to `/users/[resolved_id]` (already handled by `IdentityChip` link)
   - Infinite scroll sentinel (same `IntersectionObserver` pattern as `EventTable`) or explicit "Load more" button
   - Empty state message when no users found
   - Loading skeleton during fetch
   - `data-testid="users-search"` on the search input, `data-testid="users-table"` on the table container

## Sprint contract

- [ ] Test suite → `pnpm test` exits 0 with 0 failures
- [ ] Linter → `pnpm lint` exits 0
- [ ] Type check → `pnpm typecheck` exits 0
- [ ] Build → `pnpm build` exits 0
- [ ] File `src/components/users/useUserSearch.ts` exists and exports `useUserSearch`
- [ ] File `src/components/users/__tests__/useUserSearch.test.ts` exists
- [ ] File `src/app/users/page.tsx` contains `"use client"` and imports `useUserSearch`
- [ ] HTTP check: GET `http://localhost:3000/users` contains `data-testid="users-search"`
- [ ] HTTP check: GET `http://localhost:3000/users` contains `data-testid="users-table"`

## Test plan

- **Test file**: `src/components/users/__tests__/useUserSearch.test.ts`
- **Module under test**: `useUserSearch` from `@/components/users/useUserSearch`
- **Cases to cover**:
  - Fetches users from `/api/users` on mount (initial load, no query)
  - Populates `users` array after successful fetch
  - Sets `loading` to `true` during fetch, `false` after completion
  - `hasMore` is `true` when API returns a `next_cursor`, `false` when `null`
  - `loadMore()` fetches next page using cursor as query param and appends results
  - `loadMore()` is a no-op when `hasMore` is `false` or `loading` is `true`
  - `setQuery("search term")` resets users list, resets cursor, and re-fetches with `q` param
  - `setQuery("")` clears the search filter and fetches unfiltered results
  - Debounces rapid `setQuery` calls (only one fetch after settling)

- **Integration gap**: HTTP checks for `GET /users` page rendering — requires dev server

## Risks and open questions

None. The API (`GET /api/users`) is fully implemented in F13 with search, cursor pagination, and all needed fields. The UI follows the same established pattern as the Event Explorer (F20). The `IdentityChip` component (F21) already handles navigation to `/users/[id]`.
