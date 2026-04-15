# F32 Plan

## Acceptance criteria

From SPEC §11 — Unit tests (Vitest):

> **`src/lib/identity.test.ts`** — verifies BR-101 (required by hard constraints):
>
> 1. Anonymous event followed by identify event → all prior events attributed to user.
> 2. Two devices linked to same user → both device's events appear in user query.
> 3. Device mapped to two users → second mapping returns 409.
> 4. Identify event is idempotent (same device + same user sent twice → no error).
>
> These tests run against a real ClickHouse instance (test database `minipanel_test`), not mocks. The test suite creates and tears down the schema before/after each test file.

## Dependencies

This feature builds on the identity resolution module (F4) and the ClickHouse client singleton (F1).

Exact files imported or extended:
- `src/lib/identity.ts` — module under test (`insertEvent`, `resolveIdentityMapping`, `queryEventsWithResolvedId`, `getEventsByResolvedId`, `IdentityConflictError`)
- `src/lib/clickhouse.ts` — production ClickHouse client (not used directly in tests; tests create their own `minipanel_test` client)

## Files to create or modify

- VERIFY `src/lib/__tests__/identity.integration.test.ts` — already exists with all 4 BR-101 scenarios. Confirm it covers every acceptance criterion, uses `minipanel_test` database, and creates/tears down schema correctly.

The existing integration test file (`src/lib/__tests__/identity.integration.test.ts`) already implements:
- BR-101 S1: anonymous event + identify → retroactive merge (line 98)
- BR-101 S2: two devices linked to same user → events from both returned (line 128)
- BR-101 S3: device → two different users → IdentityConflictError 409 (lines 159, 183)
- BR-101 S4: idempotent mapping (line 210)
- `minipanel_test` database via dedicated `testClient` (line 33)
- `beforeAll` creates database + tables idempotently (line 43)
- `afterEach` truncates both tables for isolation (line 91)
- `afterAll` closes client (line 87)
- `describe.skipIf` when ClickHouse unreachable (line 39)

If any gap is found during verification, the file should be modified (not recreated).

## Implementation order

1. **Verify test file completeness** — Read `src/lib/__tests__/identity.integration.test.ts` and confirm all 4 spec scenarios are present, test assertions match spec expectations, and the test database lifecycle (create/truncate/close) is correct.
2. **Run tests against live ClickHouse** — Execute `pnpm test` with ClickHouse running to confirm all identity integration tests pass with 0 failures.
3. **Fix any gaps** — If a scenario is missing or an assertion is incomplete, modify the existing test file to match the spec exactly.
4. **Run lint + typecheck** — Confirm `pnpm lint` and `pnpm typecheck` exit 0.

## Sprint contract

- [ ] File `src/lib/__tests__/identity.integration.test.ts` exists
- [ ] File contains test for BR-101 S1: anonymous event → identify → retroactive merge (query by resolved user returns both events)
- [ ] File contains test for BR-101 S2: two devices linked to same user → events from both devices returned
- [ ] File contains test for BR-101 S3: device mapped to two different users → throws `IdentityConflictError` with status 409
- [ ] File contains test for BR-101 S4: same device + same user sent twice → no error (idempotent)
- [ ] Tests use `minipanel_test` database (not `minipanel`)
- [ ] Tests create database and tables in `beforeAll` (idempotent: `CREATE ... IF NOT EXISTS`)
- [ ] Tests truncate tables in `afterEach` for isolation
- [ ] Test suite → 0 failures (`pnpm test`)
- [ ] Lint → exit 0 (`pnpm lint`)
- [ ] Type check → exit 0 (`pnpm typecheck`)

## Test plan

This feature **is** the test plan. F32 is about writing/verifying the integration tests themselves. The module under test (`src/lib/identity.ts`) was implemented in F4; the tests exercise it against real ClickHouse.

- **Test file**: `src/lib/__tests__/identity.integration.test.ts`
- **Module under test**: `@/lib/identity` — `insertEvent`, `resolveIdentityMapping`, `queryEventsWithResolvedId`, `getEventsByResolvedId`, `IdentityConflictError`
- **Cases to cover** (all against real ClickHouse `minipanel_test`):
  1. Insert anonymous event (device_id only), then identify event (device_id + user_id) → query by user's resolved_id returns both events (retroactive merge)
  2. Insert events with two different device_ids but same user_id → query by user returns events from both devices
  3. Insert event linking device to user A, then insert event linking same device to user B → second call throws `IdentityConflictError` with `.status === 409`
  4. Insert event linking device to user, then insert another event with same device + same user → second call succeeds, both events stored

No integration gaps — these tests run against real ClickHouse by design.

## Risks and open questions

- **ClickHouse availability**: Tests use `describe.skipIf(!(await isClickHouseReachable()))` so they are silently skipped when ClickHouse is not running. The sprint contract's "0 failures" criterion passes even if tests are skipped (skipped ≠ failed). To verify the tests actually execute, ClickHouse must be running during `pnpm test`. This is an inherent property of the integration test design — the generator should verify tests actually ran (not just skipped) when ClickHouse is available.
