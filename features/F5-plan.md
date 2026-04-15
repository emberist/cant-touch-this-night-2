# F5 Plan

## Acceptance criteria

From SPEC §6.1 — **POST /api/events** (single event ingestion):

- `event_name` required.
- At least one of `device_id` or `user_id` required.
- `timestamp` optional; defaults to server time.
- `properties` optional; any flat key-value object.
- `201 Created` — event stored.
- `400 Bad Request` — missing required fields. Body: `{ "error": "..." }`.
- `409 Conflict` — device already mapped to a different user.

From SPEC §5 — Identity resolution write path:

1. Validate: at least one of device_id or user_id must be present.
2. If timestamp is missing, set to now().
3. Insert raw event into `events` table.
4. If BOTH device_id AND user_id are present:
   a. Check identity_mappings FINAL for this device_id.
   b. If no mapping exists → INSERT (device_id, user_id).
   c. If mapping exists with same user_id → no-op (idempotent).
   d. If mapping exists with different user_id → reject with 409 Conflict.

## Dependencies

Completed features this builds on (no `F*-done` sentinel files exist, but git history confirms F1–F4 are committed):

- **F1** — `src/lib/clickhouse.ts` (ClickHouse client singleton)
- **F2** — `scripts/migrate.ts` + `scripts/schema.sql` (database/table creation)
- **F4** — `src/lib/identity.ts` (validation, identity resolution, event insertion logic)

Exact files imported:
- `src/lib/identity.ts` — `insertEvent`, `IdentityConflictError`

## Files to create or modify

- **CREATE** `src/app/api/events/route.ts` — POST handler for `/api/events`

## Implementation order

1. Create `src/app/api/events/route.ts` with an exported `POST` function that:
   - Reads the JSON request body.
   - Calls `insertEvent()` from `src/lib/identity.ts`.
   - Returns `201` with the inserted event row on success.
   - Catches validation errors → returns `400` with `{ error: message }`.
   - Catches `IdentityConflictError` → returns `409` with `{ error: message }`.

That's it — one file, one function. All business logic already lives in `src/lib/identity.ts`.

## Sprint contract

- [ ] File `src/app/api/events/route.ts` exists and exports a `POST` function
- [ ] Test suite → `pnpm test` exits with 0 failures
- [ ] Lint check → `pnpm lint` exits 0
- [ ] Type check → `pnpm typecheck` exits 0
- [ ] Build check → `pnpm build` exits 0
- [ ] **Integration gap**: POST `http://localhost:3000/api/events` with valid body `{"event_name":"Page Viewed","device_id":"dev-1"}` → 201 response with JSON containing `event_id` and `event_name`
- [ ] **Integration gap**: POST `http://localhost:3000/api/events` with `{"device_id":"dev-1"}` (missing event_name) → 400 response with JSON containing `error`
- [ ] **Integration gap**: POST `http://localhost:3000/api/events` with `{"event_name":"X"}` (missing both identifiers) → 400 response with JSON containing `error`

## Test plan

- **Test file**: `src/app/api/events/__tests__/route.test.ts`
- **Module under test**: `POST` handler from `src/app/api/events/route.ts`
- **Cases to cover**:
  - Returns 201 and JSON body with `event_id`, `event_name`, `resolved_id` when given a valid event with `device_id` only
  - Returns 201 when given a valid event with `user_id` only
  - Returns 201 when given a valid event with both `device_id` and `user_id`
  - Preserves caller-provided `timestamp` in the returned row
  - Returns 400 with `{ error: "..." }` when `event_name` is missing
  - Returns 400 with `{ error: "..." }` when both `device_id` and `user_id` are missing
  - Returns 409 with `{ error: "..." }` when `IdentityConflictError` is thrown by `insertEvent`
  - Returns 400 when request body is not valid JSON (malformed body)

  Tests mock `insertEvent` and `IdentityConflictError` from `@/lib/identity` — the route handler is a thin HTTP adapter; identity logic is already unit-tested in `src/lib/__tests__/identity.test.ts`.

- **Integration gap**: Full round-trip POST → ClickHouse → response requires a running dev server and ClickHouse instance.

## Risks and open questions

None. The route handler is a straightforward adapter between HTTP and the already-implemented `insertEvent` function. All edge cases (validation, identity conflict) are handled by the identity module.
