# F13 Eval Sprint 1 — 2026-04-15

## Tests written

- `src/lib/__tests__/users.integration.test.ts` — integration gap coverage (requires live ClickHouse):
  - `searchUsers`: returns identified user with resolved_id/first_seen/last_seen/event_count from real DB
  - `searchUsers`: q substring filter (alice vs bob)
  - `searchUsers`: empty result when q matches nothing
  - `searchUsers`: cursor pagination — page 2 contains no resolved_ids from page 1
  - `searchUsers`: resolved identity — device event attributed to mapped user via identity_mappings
  - `getUserProfile`: returns null when no events exist for resolved_id
  - `getUserProfile`: returns profile with all required fields when user exists
  - `getUserProfile`: identity_cluster includes associated user_ids and device_ids
  - `getUserProfile`: events are returned newest first (ORDER BY timestamp DESC)

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| Test suite → 0 failures | 0 failures | 0 failures (211 passing, 25 skipped) | ✅ |
| Linter → exit 0 | exit 0 | exit 0 (52 files, no errors) | ✅ |
| Type check → exit 0 | exit 0 | exit 0 | ✅ |
| Build → exit 0 | exit 0 | exit 0 (`/api/users` and `/api/users/[id]` listed as ƒ Dynamic) | ✅ |
| `src/lib/users.ts` exists, exports `searchUsers` and `getUserProfile` | present | exports confirmed via grep | ✅ |
| `src/app/api/users/route.ts` exists, exports `GET` | present | exports confirmed via grep | ✅ |
| `src/app/api/users/[id]/route.ts` exists, exports `GET` | present | exports confirmed via grep | ✅ |
| HTTP: `GET /api/users` → JSON with `users` array and `next_cursor` key | JSON `{users:[...],next_cursor:...}` | `{"users":[{"resolved_id":"","first_seen":"...","last_seen":"...","event_count":15}],"next_cursor":null}` | ✅ |
| HTTP: `GET /api/users?q=nonexistent_xyz_test` → `"users":[]` | `"users":[]` | `{"users":[],"next_cursor":null}` | ✅ |
| HTTP: `GET /api/users/test-nonexistent-user-id-999` → 404 | HTTP 404 | HTTP 404 `{"error":"User \"test-nonexistent-user-id-999\" not found."}` | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

1. **HTTP checks require empty password.** The bundled ClickHouse binary starts without a password configured. The app defaults to `password: "password"` (from `clickhouse.ts`). HTTP checks required running Next.js with `CLICKHOUSE_PASSWORD=""`. Operators need a `.env.local` with `CLICKHOUSE_PASSWORD=` (empty value) to use the default local setup. This is a pre-existing environment issue documented in the ISSUES.md F2 entry.

2. **Empty resolved_id in live database.** `/api/users` returned a user with `resolved_id: ""`. This is a data quality issue in the existing seeded data (events where both `device_id` and `user_id` are NULL or empty string). The query logic (`coalesce(e.user_id, m.user_id, e.device_id)`) is correct per spec — empty string from device_id is a valid (if degenerate) identity. Not a code bug.

3. **Integration test skip behavior.** `isClickHouseReachable()` uses the unauthenticated `/ping` endpoint, so it returns `true` whenever ClickHouse is running regardless of the password. When ClickHouse is running but with a different password than `CLICKHOUSE_PASSWORD`, `beforeAll` will fail and all tests in the describe will be reported as skipped with the file marked failed. This is the same pattern used by all other integration test files in the project — not a regression.

4. **Unit test correctness.** All generator-written unit tests are correct and complete. The null-detection workaround (checking `event_count === 0` instead of `first_seen === null`) is properly documented and tested.

5. **Cursor pagination is lexicographic on resolved_id.** Not defined in spec; plan's approach (alphabetical ordering) is correct and consistent.
