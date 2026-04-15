# F5 Sprint 1 — 2026-04-15

## Test files written

- `src/app/api/events/__tests__/route.test.ts` — covers all 8 test plan cases:
  - Returns 201 with `event_id`, `event_name`, `resolved_id` for device_id-only event
  - Returns 201 for user_id-only event
  - Returns 201 for event with both `device_id` and `user_id`
  - Preserves caller-provided `timestamp` in the returned row
  - Passes parsed body to `insertEvent` (structural check)
  - Returns 400 when `event_name` is missing
  - Returns 400 when both `device_id` and `user_id` are missing
  - Returns 400 for malformed JSON body
  - Returns 409 when `IdentityConflictError` is thrown

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| File `src/app/api/events/route.ts` exists and exports `POST` | ✅ | Confirmed |
| Test suite → `pnpm test` exits with 0 failures | ✅ | 42 passing, 16 skipped (integration tests) |
| Lint check → `pnpm lint` exits 0 | ✅ | "Checked 24 files. No fixes applied." |
| Type check → `pnpm typecheck` exits 0 | ✅ | Clean |
| Build check → `pnpm build` exits 0 | ✅ | `/api/events` shown as dynamic route |
| Integration gap: valid POST → 201 with `event_id` and `event_name` | — | Requires running dev server + ClickHouse |
| Integration gap: POST missing `event_name` → 400 with `error` | — | Requires running dev server + ClickHouse |
| Integration gap: POST missing both identifiers → 400 with `error` | — | Requires running dev server + ClickHouse |

## Files created / modified

- `src/app/api/events/route.ts` — **created**: exports `POST` handler; parses JSON body, calls `insertEvent`, maps `IdentityConflictError` → 409, validation `Error` → 400, success → 201
- `src/app/api/events/__tests__/route.test.ts` — **created**: unit tests mocking `@/lib/identity`

## Implementation notes

- Route handler accepts `Request` (base Web API type) rather than `NextRequest` — the handler only calls `request.json()`, which is on the base type, and this avoids the type mismatch when calling `POST()` directly in unit tests.
- `MockIdentityConflictError` must be defined inside `vi.hoisted()` to avoid the temporal dead zone error that occurs when a class defined at module scope is referenced inside a hoisted `vi.mock()` factory.

## Known gaps

None. All non-integration criteria pass.

## Issues logged

None.
