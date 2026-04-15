# F26 Plan

## Acceptance criteria

From SPEC §7.5 (User Profiles — `/users`):

- Profile page shows:
  - Identity cluster (user IDs + device IDs as chips)
  - First seen / Last seen
  - Event timeline: reverse chronological, same format as Explorer

From SPEC §6.6 (`GET /api/users/[id]`):

- Returns:
  ```json
  {
    "resolved_id": "user@example.com",
    "first_seen": "...",
    "last_seen": "...",
    "identity_cluster": {
      "user_ids": ["user@example.com"],
      "device_ids": ["device-abc", "device-xyz"]
    },
    "events": [...]
  }
  ```

From SPEC §8 (Component Structure):

- `src/app/users/[id]/page.tsx` — Profile page
- `src/components/UserTimeline.tsx` — component for user event timeline

## Dependencies

Completed features this builds on:

- **F14** (`GET /api/users/[id]` route) — `src/app/api/users/[id]/route.ts` serves the profile JSON; `src/lib/users.ts` exports `getUserProfile`, `UserProfile`, `IdentityCluster`
- **F18** (Navigation shell) — `src/components/Sidebar.tsx` provides layout
- **F21** (Shared UI components) — `src/components/ui/IdentityChip.tsx` and `src/components/ui/JsonChip.tsx`
- **F25** (User search page) — `src/app/users/page.tsx` links to `/users/[id]` via `IdentityChip`

Existing files that will be imported or extended:

- `src/lib/users.ts` — types `UserProfile`, `IdentityCluster`, `EventRow` (re-exported from `identity.ts`)
- `src/components/ui/IdentityChip.tsx` — renders resolved_id as clickable chip
- `src/components/ui/JsonChip.tsx` — renders collapsed JSON properties
- `src/components/EventTable.tsx` — existing event table component (reference for timeline format, but the profile timeline is a simpler non-paginated list, so a dedicated `UserTimeline` component is warranted per spec §8)

## Files to create or modify

- CREATE `src/app/users/[id]/page.tsx` — User profile page (client component fetching from `/api/users/[id]`)
- CREATE `src/components/UserTimeline.tsx` — Event timeline component for user profile (reverse chronological event list matching Explorer format)
- CREATE `src/components/users/useUserProfile.ts` — Custom hook for fetching user profile data from `/api/users/[id]`
- CREATE `src/components/users/__tests__/useUserProfile.test.ts` — Unit tests for the profile hook

## Implementation order

1. **Create `src/components/users/useUserProfile.ts`** — custom hook that:
   - Takes a `resolved_id` string parameter
   - Fetches from `/api/users/${encodeURIComponent(resolved_id)}`
   - Maintains state: `profile` (`UserProfile | null`), `loading` (boolean), `error` (string | null)
   - Fetches on mount and when `resolved_id` changes
   - Returns `{ profile, loading, error }`

2. **Create `src/components/users/__tests__/useUserProfile.test.ts`** — unit tests for the hook

3. **Create `src/components/UserTimeline.tsx`** — client component that:
   - Accepts `events: EventRow[]` prop
   - Renders an MUI `Table` with columns: Timestamp, Event Name, Properties (using `JsonChip`)
   - No Resolved Identity column (redundant on profile page — all events belong to the same user)
   - Reverse chronological order (events already sorted from API)
   - Empty state message when no events
   - `data-testid="user-timeline"` on the table container

4. **Create `src/app/users/[id]/page.tsx`** — client component that:
   - Uses `useParams()` to get the `id` from the route
   - Calls `useUserProfile(id)` to fetch profile data
   - Displays loading skeleton while fetching
   - Shows 404 message if profile is null and not loading
   - Shows error message if fetch fails
   - Renders identity cluster section: user IDs and device IDs as MUI `Chip` components
   - Renders first seen / last seen as formatted dates
   - Renders `UserTimeline` with the profile's events
   - `data-testid="user-profile"` on the container
   - `data-testid="identity-cluster"` on the cluster section

## Sprint contract

- [ ] Test suite → `pnpm test` exits 0 with 0 failures
- [ ] Linter → `pnpm lint` exits 0
- [ ] Type check → `pnpm typecheck` exits 0
- [ ] Build → `pnpm build` exits 0
- [ ] File `src/components/users/useUserProfile.ts` exists and exports `useUserProfile`
- [ ] File `src/components/users/__tests__/useUserProfile.test.ts` exists
- [ ] File `src/components/UserTimeline.tsx` exists and exports `UserTimeline`
- [ ] File `src/app/users/[id]/page.tsx` exists and contains `"use client"`
- [ ] HTTP check: GET `http://localhost:3000/users/test` contains `data-testid="user-profile"`
- [ ] HTTP check: GET `http://localhost:3000/users/test` contains `data-testid="identity-cluster"`
- [ ] HTTP check: GET `http://localhost:3000/users/test` contains `data-testid="user-timeline"`

## Test plan

- **Test file**: `src/components/users/__tests__/useUserProfile.test.ts`
- **Module under test**: `useUserProfile` from `@/components/users/useUserProfile`
- **Cases to cover**:
  - Fetches profile from `/api/users/{id}` on mount
  - Sets `loading` to `true` during fetch, `false` after completion
  - Populates `profile` with API response data on success
  - Sets `error` when API returns 404
  - Sets `error` when fetch fails (network error)
  - Re-fetches when `resolved_id` parameter changes
  - URL-encodes the resolved_id (e.g. `user@example.com` → `user%40example.com`)

- **Integration gap**: HTTP checks for `GET /users/[id]` page rendering — requires dev server
- **Integration gap**: Identity cluster chips display with correct user_ids and device_ids — requires dev server and seeded data
- **Integration gap**: UserTimeline renders events in reverse chronological order — requires dev server and seeded data

## Risks and open questions

None. The API (`GET /api/users/[id]`) is fully implemented in F14 and returns all needed fields (resolved_id, first_seen, last_seen, identity_cluster, events). The UI follows established patterns from the Explorer page (F20) and User search page (F25). Shared components (`IdentityChip`, `JsonChip`) are available from F21.
