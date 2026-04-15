# F13 Plan

## Acceptance criteria

From SPEC §6.6 — User Profiles:

**`GET /api/users`**

- Query params: `q` (search string), `limit`, `cursor`.
- Returns a list of users matching the search query with cursor-based pagination.

**`GET /api/users/[id]`**

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

From SPEC §4.3 — Resolved identity:
- Resolved identity is `coalesce(e.user_id, m.user_id, e.device_id)`.
- Uses `identity_mappings FINAL` JOIN at query time.

## Dependencies

Completed features this builds on:
- F1 (`features/F1-done.md`) — ClickHouse client singleton (`src/lib/clickhouse.ts`)
- F2 (`features/F2-done.md`) — Migration script with `events` and `identity_mappings` tables
- F4 (`features/F4-done.md`) — Identity resolution logic (`src/lib/identity.ts`) — provides `queryEventsWithResolvedId`, `EventRow`
- F7 (`features/F7-done.md`) — Events list route with cursor pagination (pattern reference)

Files that will be imported or extended:
- `src/lib/clickhouse.ts` — ClickHouse client singleton
- `src/lib/identity.ts` — `EventRow` type, `queryEventsWithResolvedId` function (reused for user event timeline)

## Files to create or modify

- CREATE `src/lib/users.ts` — user search query, user profile query, types
- CREATE `src/app/api/users/route.ts` — `GET /api/users` handler
- CREATE `src/app/api/users/[id]/route.ts` — `GET /api/users/[id]` handler
- CREATE `src/lib/__tests__/users.test.ts` — unit tests for user query logic
- CREATE `src/app/api/users/__tests__/route.test.ts` — unit tests for `GET /api/users` route handler
- CREATE `src/app/api/users/[id]/__tests__/route.test.ts` — unit tests for `GET /api/users/[id]` route handler

## Implementation order

1. **Create `src/lib/users.ts`** — Define types (`UserListItem`, `UserProfile`, `UserSearchOptions`) and implement two query functions:
   - `searchUsers(options)` — queries distinct resolved identities from events joined with identity_mappings FINAL, filtered by `q` (ILIKE match on resolved_id), with cursor-based pagination (`cursor` = last resolved_id from previous page, lexicographic ordering). Returns `{ users: UserListItem[], next_cursor: string | null }`.
   - `getUserProfile(resolved_id)` — queries first_seen, last_seen, identity cluster (all user_ids and device_ids associated with this resolved_id), and recent events. Returns `UserProfile | null`.

2. **Create `src/lib/__tests__/users.test.ts`** — Unit tests for `searchUsers` and `getUserProfile` with mocked ClickHouse client.

3. **Create `src/app/api/users/route.ts`** — `GET /api/users` handler. Parses `q`, `limit` (default 50, max 200), `cursor` from query params. Calls `searchUsers`. Returns `{ users, next_cursor }`.

4. **Create `src/app/api/users/__tests__/route.test.ts`** — Unit tests for the route handler (validation, param forwarding, error handling).

5. **Create `src/app/api/users/[id]/route.ts`** — `GET /api/users/[id]` handler. Extracts `id` from route params. Calls `getUserProfile`. Returns the profile or 404 if not found.

6. **Create `src/app/api/users/[id]/__tests__/route.test.ts`** — Unit tests for the user profile route handler.

## Sprint contract

- [ ] Test suite → `pnpm test` exits 0 with 0 failures
- [ ] Linter → `pnpm lint` exits 0
- [ ] Type check → `pnpm typecheck` exits 0
- [ ] Build → `pnpm build` exits 0
- [ ] File `src/lib/users.ts` exists and exports `searchUsers` and `getUserProfile`
- [ ] File `src/app/api/users/route.ts` exists and exports `GET`
- [ ] File `src/app/api/users/[id]/route.ts` exists and exports `GET`
- [ ] HTTP check: start dev server, `GET http://localhost:3000/api/users` → response is JSON with `users` array and `next_cursor` key
- [ ] HTTP check: start dev server, `GET http://localhost:3000/api/users?q=nonexistent_xyz_test` → response contains `"users":[]`
- [ ] HTTP check: start dev server, `GET http://localhost:3000/api/users/test-nonexistent-user-id-999` → response status is 404

## Test plan

- **Test file**: `src/lib/__tests__/users.test.ts`
- **Module under test**: `searchUsers`, `getUserProfile` from `src/lib/users.ts`
- **Cases to cover**:
  - `searchUsers`: returns users list with resolved_id, first_seen, last_seen, event_count
  - `searchUsers`: applies `q` filter (generates ILIKE condition in query)
  - `searchUsers`: respects `limit` parameter, caps at 200
  - `searchUsers`: applies cursor for pagination (generates condition in query)
  - `searchUsers`: returns `next_cursor` when result count equals limit, null otherwise
  - `searchUsers`: returns empty array when no results
  - `getUserProfile`: returns profile with resolved_id, first_seen, last_seen, identity_cluster, events
  - `getUserProfile`: identity_cluster includes all associated user_ids and device_ids
  - `getUserProfile`: returns null when resolved_id not found

- **Test file**: `src/app/api/users/__tests__/route.test.ts`
- **Module under test**: `GET` from `src/app/api/users/route.ts`
- **Cases to cover**:
  - Returns 200 with `{ users, next_cursor }` on valid request
  - Forwards `q`, `limit`, `cursor` params to `searchUsers`
  - Returns 400 when limit is not a positive integer
  - Defaults limit to 50 when not provided
  - Caps limit at 200
  - Returns 500 when searchUsers throws

- **Test file**: `src/app/api/users/[id]/__tests__/route.test.ts`
- **Module under test**: `GET` from `src/app/api/users/[id]/route.ts`
- **Cases to cover**:
  - Returns 200 with full profile when user exists
  - Returns 404 with `{ error }` when user not found
  - Returns 500 when getUserProfile throws

- **Integration gap**: HTTP checks for `/api/users`, `/api/users?q=...`, `/api/users/[id]` — requires dev server

## Risks and open questions

1. **Cursor pagination strategy for users**: The spec says `cursor` but doesn't define the cursor format. The plan uses lexicographic cursor on `resolved_id` (alphabetical ordering), which provides stable, deterministic pagination. This is the simplest approach that works correctly.

2. **User search semantics**: The spec says `q` is a "search string" but doesn't specify whether it's prefix, substring, or fuzzy. The plan uses ILIKE substring match (`%q%`) for simplicity and broad matching.

3. **Event count in user list**: The spec's `/api/users` response shape isn't fully defined (only the `/api/users/[id]` response is). The plan includes `resolved_id`, `first_seen`, `last_seen`, and `event_count` as reasonable list fields.
