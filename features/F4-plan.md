# F4 Plan

## Acceptance criteria

From SPEC §5 — Identity Resolution Algorithm:

**Write path (event ingestion):**
1. Validate: at least one of `device_id` or `user_id` must be present.
2. If `timestamp` is missing, set to `now()`.
3. Insert raw event into `events` table.
4. If BOTH `device_id` AND `user_id` are present:
   a. Check `identity_mappings FINAL` for this `device_id`.
   b. If no mapping exists → INSERT `(device_id, user_id)`.
   c. If mapping exists with same `user_id` → no-op (idempotent).
   d. If mapping exists with different `user_id` → reject with 409 Conflict.

**Read path (all queries):**
- Every query that returns events or counts users joins `events` with `identity_mappings FINAL` and uses `coalesce(e.user_id, m.user_id, e.device_id)` as the canonical identity (`resolved_id`).
- Retroactivity is automatic — ClickHouse reads current state of `identity_mappings` at query time.

**Invariants (BR-101):**
- One device → at most one user. Enforced by `ReplacingMergeTree` + 409 on conflict.
- One user → many devices. Natural: multiple rows with different `device_id` pointing to the same `user_id`.
- Merge is retroactive. No backfill jobs needed.

From SPEC §11 — Testing (BR-101 verification):
1. Anonymous event followed by identify event → all prior events attributed to user.
2. Two devices linked to same user → both devices' events appear in user query.
3. Device mapped to two users → second mapping returns 409.
4. Identify event is idempotent (same device + same user sent twice → no error).

## Dependencies

Builds on:
- **F1** — ClickHouse client singleton (`src/lib/clickhouse.ts`)
- **F2** — Migration script with `events` and `identity_mappings` table schemas (`scripts/schema.sql`, `scripts/migrate.ts`)

No `features/F*-done` sentinel files exist, but F1–F3 are committed to `main`.

## Files to create or modify

- **CREATE** `src/lib/identity.ts` — Identity resolution module: event insertion, mapping management, resolved identity query helper
- **CREATE** `src/lib/__tests__/identity.test.ts` — Unit tests (mocked ClickHouse client) for validation logic and control flow
- **CREATE** `src/lib/__tests__/identity.integration.test.ts` — Integration tests (real ClickHouse, `minipanel_test` database) verifying BR-101 scenarios

## Implementation order

1. **Create `src/lib/identity.ts`** — Define TypeScript types (`EventInput`, `InsertedEvent`, `IdentityConflictError`) and export the following functions:
   - `validateEvent(input)` — validates that `event_name` is present and at least one of `device_id`/`user_id` is set; throws on invalid input.
   - `insertEvent(input)` — validates input, defaults `timestamp` to now if missing, inserts into `events` table, then calls identity mapping logic if both `device_id` and `user_id` are present. Returns the inserted event. Throws `IdentityConflictError` (with a `status: 409` property) if the device is already mapped to a different user.
   - `resolveIdentityMapping(device_id, user_id)` — checks `identity_mappings FINAL` for existing mapping; inserts if none exists; no-ops if same user; throws conflict if different user.
   - `queryEventsWithResolvedId(options)` — builds and executes the resolved identity SELECT query (events LEFT JOIN identity_mappings FINAL with coalesce). Accepts optional filters (`event_name`, `resolved_id`, `before` cursor, `limit`). Returns events with `resolved_id` attached.
   - `getEventsByResolvedId(resolved_id)` — convenience wrapper to fetch all events for a given resolved identity.

2. **Create `src/lib/__tests__/identity.test.ts`** — Unit tests using mocked ClickHouse client (same pattern as `clickhouse.test.ts`). Tests validation logic, timestamp defaulting, and the branching logic in `resolveIdentityMapping` (no mapping → insert, same user → no-op, different user → conflict error).

3. **Create `src/lib/__tests__/identity.integration.test.ts`** — Integration tests against real ClickHouse using a `minipanel_test` database. Uses `describe.skipIf` when ClickHouse is unreachable (same pattern as `clickhouse.integration.test.ts`). Setup creates test tables, teardown truncates them. Verifies all four BR-101 scenarios end-to-end.

## Sprint contract

- [ ] File `src/lib/identity.ts` exists and exports `validateEvent`, `insertEvent`, `resolveIdentityMapping`, `queryEventsWithResolvedId`, and `getEventsByResolvedId`
- [ ] File `src/lib/__tests__/identity.test.ts` exists
- [ ] File `src/lib/__tests__/identity.integration.test.ts` exists
- [ ] Test suite → `pnpm test` exits 0 with 0 failures
- [ ] Linter → `pnpm lint` exits 0
- [ ] Type check → `pnpm typecheck` exits 0
- [ ] Build → `pnpm build` exits 0

## Test plan

### Unit tests (mocked ClickHouse)

- **Test file**: `src/lib/__tests__/identity.test.ts`
- **Module under test**: `src/lib/identity.ts` — `validateEvent`, `insertEvent`, `resolveIdentityMapping`
- **Cases to cover**:
  - `validateEvent` rejects when both `device_id` and `user_id` are missing
  - `validateEvent` rejects when `event_name` is missing/empty
  - `validateEvent` accepts event with only `device_id`
  - `validateEvent` accepts event with only `user_id`
  - `validateEvent` accepts event with both `device_id` and `user_id`
  - `insertEvent` defaults `timestamp` to current time when not provided
  - `insertEvent` preserves caller-provided `timestamp`
  - `insertEvent` inserts event into ClickHouse `events` table (verify mock called with correct query/values)
  - `insertEvent` calls `resolveIdentityMapping` when both `device_id` and `user_id` are present
  - `insertEvent` does NOT call `resolveIdentityMapping` when only `device_id` is present
  - `insertEvent` does NOT call `resolveIdentityMapping` when only `user_id` is present
  - `resolveIdentityMapping` inserts mapping when no existing mapping found (mock returns empty result)
  - `resolveIdentityMapping` is a no-op when existing mapping has the same `user_id`
  - `resolveIdentityMapping` throws `IdentityConflictError` when existing mapping has a different `user_id`

### Integration tests (real ClickHouse, `minipanel_test` database)

- **Test file**: `src/lib/__tests__/identity.integration.test.ts`
- **Module under test**: `src/lib/identity.ts` — full write + read path
- **Cases to cover** (BR-101 scenarios):
  - Anonymous event (device_id only) followed by identify event (same device_id + user_id) → `queryEventsWithResolvedId` returns all events with the user's `resolved_id` (retroactive merge)
  - Two devices linked to same user → `getEventsByResolvedId(user_id)` returns events from both devices
  - Attempt to map a device already mapped to a different user → throws `IdentityConflictError` (409)
  - Same device + same user sent twice → second call succeeds without error (idempotent)
- **Integration gap**: These require a running ClickHouse server; tests use `describe.skipIf` to skip gracefully when unavailable

## Risks and open questions

1. **ClickHouse `FINAL` timing**: `ReplacingMergeTree` deduplicates asynchronously at merge time. Queries with `FINAL` force deduplication at read time, which is correct but slightly slower. For the integration tests, we must use `FINAL` (or `OPTIMIZE TABLE ... FINAL`) to ensure deterministic results. The implementation already accounts for this per the spec.

2. **Test database isolation**: Integration tests use `minipanel_test` to avoid polluting the development database. The test setup must create this database and the required tables, and teardown must truncate (not drop) to keep the schema available across test runs.

3. **Concurrent identity mapping writes**: In a single-server scenario (the only deployment model), Node.js is single-threaded so concurrent mapping conflicts are unlikely. However, the check-then-insert in `resolveIdentityMapping` is not atomic — a race is theoretically possible under concurrent requests. The spec acknowledges this (§13.5) and defers it. No action needed for this sprint.
