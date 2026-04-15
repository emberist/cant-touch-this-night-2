# F14 Plan

## Acceptance criteria

From SPEC §6.6 — `GET /api/users/[id]`:

Returns:
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

- Returns a full user profile for a given resolved identity.
- Includes `resolved_id`, `first_seen`, `last_seen`, `identity_cluster` (user_ids + device_ids), and `events` (reverse chronological, up to 200).
- Returns 404 when no events are found for the given resolved_id.
- Returns 500 on internal errors.

## Dependencies

This feature builds on:

- **F1** — `src/lib/clickhouse.ts` (ClickHouse client singleton)
- **F4** — `src/lib/identity.ts` (identity resolution logic, `EventRow` type)
- **F13** — `src/lib/users.ts` (exports `getUserProfile`, `UserProfile` type — already fully implemented)
- **F13** — `src/app/api/users/route.ts` (sibling route, establishes pattern)

Key imports:
- `getUserProfile` from `@/lib/users` — already implemented with 3 ClickHouse queries (stats, identity cluster, events)
- `UserProfile` type from `@/lib/users`

## Files to create or modify

- **CREATE** `src/app/api/users/[id]/route.ts` — the GET route handler

Note: The library function `getUserProfile` in `src/lib/users.ts` already exists and is fully tested (unit tests in `src/lib/__tests__/users.test.ts`, integration tests in `src/lib/__tests__/users.integration.test.ts`). The route-level unit test at `src/app/api/users/[id]/__tests__/route.test.ts` also already exists and expects the route to export a `GET` function with signature `GET(request: Request, context: { params: Promise<{ id: string }> })`.

## Implementation order

1. **Create `src/app/api/users/[id]/route.ts`** — implement the `GET` handler:
   - Extract `id` from `context.params` (awaited Promise).
   - Call `getUserProfile(id)`.
   - If result is `null`, return `Response.json({ error: "User not found." }, { status: 404 })`.
   - On success, return `Response.json(result)` with status 200.
   - Wrap in try/catch; on error return `Response.json({ error: message }, { status: 500 })`.

That is the only step — the library logic and all tests are pre-written.

## Sprint contract

- [ ] File `src/app/api/users/[id]/route.ts` exists and exports a `GET` function
- [ ] Test suite → 0 failures (`pnpm test`)
- [ ] Linter → exit 0 (`pnpm lint`)
- [ ] Type check → exit 0 (`pnpm typecheck`)
- [ ] Build → exit 0 (`pnpm build`)
- [ ] HTTP check: GET `http://localhost:3000/api/users/nonexistent-id-12345` → response status 404, body contains `"error"`
- [ ] HTTP check: after seeding data via POST `http://localhost:3000/api/seed`, GET `http://localhost:3000/api/users` to find a valid user, then GET `http://localhost:3000/api/users/{resolved_id}` → response status 200, body contains `"resolved_id"`, `"identity_cluster"`, `"events"`

## Test plan

All tests for F14 are **already written** and ready to validate the implementation:

- **Route unit test**: `src/app/api/users/[id]/__tests__/route.test.ts`
  - Module under test: `GET` from `@/app/api/users/[id]/route`
  - Cases covered: returns 200 with full profile shape, passes id to getUserProfile, returns 404 when user not found, returns 500 when getUserProfile throws

- **Library unit test**: `src/lib/__tests__/users.test.ts`
  - Module under test: `getUserProfile` from `@/lib/users`
  - Cases covered: returns profile with all fields, identity_cluster includes associated user_ids/device_ids, returns null when not found

- **Library integration test**: `src/lib/__tests__/users.integration.test.ts`
  - Module under test: `getUserProfile` from `@/lib/users`
  - Cases covered: returns null for nonexistent user, returns correct fields when user exists, identity_cluster includes device_ids, events ordered newest first

- **Integration gap**: HTTP checks against dev server (GET `/api/users/[id]`) — requires running dev server

No new tests need to be written for this feature.

## Risks and open questions

None. The `getUserProfile` function is already fully implemented and tested. This feature is a thin route handler that delegates entirely to the library function. The route test is also pre-written, so the implementation is fully constrained by the existing test expectations.
