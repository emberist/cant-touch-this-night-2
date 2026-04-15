# F32 Eval Sprint 2 — 2026-04-15

## Tests written

No new test files were written. The identity integration test file was verified complete in Sprint 1 and unchanged in Sprint 2. No integration gaps remain uncovered.

Files verified (unchanged, not deleted):
- `src/lib/__tests__/identity.integration.test.ts` — all 4 BR-101 scenarios

Sprint 2 did not introduce new integration/e2e test coverage targets — the sprint was purely a bug-fix sprint resolving issues exposed when tests actually ran against live ClickHouse.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| File `src/lib/__tests__/identity.integration.test.ts` exists | file exists | file exists — unchanged from Sprint 1 | ✅ |
| BR-101 S1: anonymous event → identify → retroactive merge | test at line 98 | `✓ BR-101 S1: anonymous event followed by identify event → all events attributed to user (retroactive merge) 155ms` | ✅ |
| BR-101 S2: two devices linked to same user → events from both returned | test at line 128 | `✓ BR-101 S2: two devices linked to same user → events from both devices returned 274ms` | ✅ |
| BR-101 S3: device mapped to two different users → `IdentityConflictError` with status 409 | tests at lines 159, 183 | `✓ BR-101 S3: device mapped to two different users → second mapping throws IdentityConflictError (409) 212ms` / `✓ BR-101 S3: IdentityConflictError has status 409 208ms` | ✅ |
| BR-101 S4: same device + same user sent twice → no error (idempotent) | test at line 210 | `✓ BR-101 S4: same device + same user sent twice → second call succeeds (idempotent) 213ms` | ✅ |
| Tests use `minipanel_test` database (not `minipanel`) | `TEST_DB = "minipanel_test"` | line 19: `const TEST_DB = "minipanel_test"` — `testClient` uses it at lines 33–37 | ✅ |
| Tests create database and tables in `beforeAll` (idempotent) | `CREATE ... IF NOT EXISTS` | lines 42–84: `CREATE DATABASE IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS` for both tables | ✅ |
| Tests truncate tables in `afterEach` for isolation | `TRUNCATE TABLE events` + `TRUNCATE TABLE identity_mappings` | lines 91–95: both tables truncated | ✅ |
| Test suite → 0 failures (`pnpm test`) | 0 failures | **638 passed (638) — all 5 identity integration tests ran and passed (not skipped)** | ✅ |
| Lint → exit 0 (`pnpm lint`) | exit 0 | exit 0 (31 warnings, 0 errors — pre-existing warnings in unrelated files) | ✅ |
| Type check → exit 0 (`pnpm typecheck`) | exit 0 | exit 0 | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

### Tests confirmed executed, not skipped

Sprint 1's eval noted the risk that `isClickHouseReachable()` only checks `/ping` (no auth required) and could silently cause tests to skip when auth fails. Sprint 2 fixed the auth issue by loading `.env.local` via `loadEnvFile()` in `vitest.config.ts`. Verified via `--reporter=verbose` output: all 5 identity integration tests show individual pass timings (155ms–274ms), confirming they executed against real ClickHouse rather than being skipped.

### Three root-cause fixes verified in production code

1. **`src/lib/identity.ts:156`** — `toClickHouseTs()` helper converts `new Date().toISOString()` output (`"…T…Z"`) to `"YYYY-MM-DD HH:MM:SS.mmm"` before ClickHouse insert. Fix is correctly scoped: only the INSERT payload is converted; the returned `EventRow.timestamp` still carries ISO format as expected by callers.

2. **`vitest.config.ts`** — `loadEnvFile()` parses `.env.local` and passes it to `test.env`. Confirmed that `.env.local` contains `CLICKHOUSE_PASSWORD=` (empty), which matches the local ClickHouse server configuration. `fileParallelism: false` prevents race conditions between `identity.integration.test.ts` and `users.integration.test.ts` sharing the same `minipanel_test` tables.

3. **`scripts/__tests__/migrate.integration.test.ts`** — Conditional `--password` spread correctly omits the flag when empty. The TCP/HTTP-mismatch test uses `timeout: 3000` to stay within Vitest's 5s limit.

### Lint warnings are pre-existing

All 31 lint warnings are in files unrelated to F32 (TrendChart, useGenerator, useLiveFeed, TrendsControls, seed). None are in files touched by F32. Exit code is 0, satisfying the sprint contract.
