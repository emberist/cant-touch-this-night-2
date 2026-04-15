# F13 Sprint 1 — 2026-04-15

## Test files written

- `src/lib/__tests__/users.test.ts` — covers all `searchUsers` and `getUserProfile` cases:
  - returns users list with resolved_id, first_seen, last_seen, event_count
  - applies q filter (ILIKE condition in query)
  - respects limit, caps at 200
  - applies cursor for pagination
  - returns next_cursor when result count equals limit, null otherwise
  - returns empty array when no results
  - returns profile with all fields (resolved_id, first_seen, last_seen, identity_cluster, events)
  - identity_cluster includes all associated user_ids and device_ids
  - returns null when resolved_id not found (detects via event_count === 0)

- `src/app/api/users/__tests__/route.test.ts` — covers GET /api/users handler:
  - returns 200 with users array and next_cursor
  - forwards q, limit, cursor params to searchUsers
  - defaults limit to 50
  - caps limit at 200
  - returns 400 for non-positive limit (including 0, negative, non-numeric)
  - returns 500 when searchUsers throws

- `src/app/api/users/[id]/__tests__/route.test.ts` — covers GET /api/users/[id] handler:
  - returns 200 with full profile when user exists
  - passes id to getUserProfile
  - returns 404 with error when user not found
  - returns 500 when getUserProfile throws

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| Test suite → 0 failures | ✅ | 211 passing, 16 skipped (integration tests, require live CH), 0 failing |
| Linter → exit 0 | ✅ | `biome check` — Checked 51 files, no errors |
| Type check → exit 0 | ✅ | `tsc --noEmit` — no output (clean) |
| Build → exit 0 | ✅ | `next build` succeeds; `/api/users` and `/api/users/[id]` both listed as dynamic routes |
| `src/lib/users.ts` exists, exports `searchUsers` and `getUserProfile` | ✅ | |
| `src/app/api/users/route.ts` exists, exports `GET` | ✅ | |
| `src/app/api/users/[id]/route.ts` exists, exports `GET` | ✅ | |
| HTTP: `GET /api/users` → JSON with `users` array and `next_cursor` key | ✅ | `{"users":[...],"next_cursor":null}` |
| HTTP: `GET /api/users?q=nonexistent_xyz_test` → `"users":[]` | ✅ | `{"users":[],"next_cursor":null}` |
| HTTP: `GET /api/users/test-nonexistent-user-id-999` → 404 | ✅ | HTTP 404, `{"error":"User \"test-nonexistent-user-id-999\" not found."}` |

## Files created / modified

- `src/lib/users.ts` — created; exports `UserListItem`, `IdentityCluster`, `UserProfile`, `UserSearchOptions`, `UserSearchResult` types plus `searchUsers` and `getUserProfile` functions
- `src/app/api/users/route.ts` — created; exports `GET` handler for `GET /api/users`
- `src/app/api/users/[id]/route.ts` — created; exports `GET` handler for `GET /api/users/[id]`
- `src/lib/__tests__/users.test.ts` — created; unit tests for lib functions
- `src/app/api/users/__tests__/route.test.ts` — created; unit tests for users list route
- `src/app/api/users/[id]/__tests__/route.test.ts` — created; unit tests for user profile route
- `ISSUES.md` — appended F13 entry (ClickHouse null detection workaround)

## Known gaps

None. All sprint contract criteria verified.

## Issues logged

ISSUES.md updated: F13 — `getUserProfile` null detection for missing users.

ClickHouse returns the epoch (`1970-01-01 00:00:00.000`) rather than `NULL` when `min(DateTime64)` aggregates over an empty result set. The naive `first_seen === null` check therefore never triggers. Fix: include `count() AS event_count` in the stats query and gate on `Number(event_count) === 0`. Unit test updated accordingly.

## Implementation notes

- `searchUsers` uses a `GROUP BY resolved_id` + `HAVING` pattern so ILIKE and cursor filters apply to the resolved alias.
- Cursor is the lexicographic last `resolved_id` on the page; the next page starts with `resolved_id > cursor`.
- `getUserProfile` makes three ClickHouse queries: stats (first_seen/last_seen/count), identity cluster (distinct user_id/device_id pairs), events (newest 200).
- The `[id]` route handler uses an explicit `{ params: Promise<{ id: string }> }` type rather than `RouteContext<'/api/users/[id]'>` because the generated `.next/types/routes.d.ts` does not include the new route until after `next build` runs. Using the explicit type keeps `pnpm typecheck` clean in all states.
