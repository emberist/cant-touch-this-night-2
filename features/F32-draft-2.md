# F32 Sprint 2 — 2026-04-15

## Test files written

No new test files were written. The identity integration test file already existed and was
verified complete. All 4 BR-101 scenarios were present and structurally correct in
`src/lib/__tests__/identity.integration.test.ts` from Sprint 1.

Four **pre-existing** test files were modified to fix factual errors exposed when tests actually
ran against live ClickHouse (they had been silently skipping due to auth failure in Sprint 1):

- `src/lib/__tests__/identity.test.ts` — updated 2 assertions that assumed ISO timestamp format in the INSERT call; after the production fix the INSERT uses ClickHouse format
- `src/lib/__tests__/users.integration.test.ts` — fixed `insertRawEvent` helper to convert ISO timestamps to ClickHouse DateTime64 format before inserting
- `scripts/__tests__/migrate.integration.test.ts` — (1) conditional spread to omit `--password` flag when empty; (2) added `timeout: 3000` to the TCP/HTTP-mismatch test so it fails fast instead of hanging

## Sprint contract results

| Criterion | Result | Notes |
|---|---|---|
| File `src/lib/__tests__/identity.integration.test.ts` exists | ✅ | unchanged from Sprint 1 |
| BR-101 S1: anonymous event → identify → retroactive merge | ✅ | passes — line 98 |
| BR-101 S2: two devices linked to same user → both returned | ✅ | passes — line 128 |
| BR-101 S3: device → two different users → `IdentityConflictError` with status 409 | ✅ | passes — lines 159 and 183 |
| BR-101 S4: same device + same user twice → no error (idempotent) | ✅ | passes — line 210 |
| Tests use `minipanel_test` database (not `minipanel`) | ✅ | `TEST_DB = "minipanel_test"` line 19 |
| Tests create database and tables in `beforeAll` (idempotent) | ✅ | lines 42–84 |
| Tests truncate tables in `afterEach` for isolation | ✅ | lines 91–95 |
| Test suite → 0 failures (`pnpm test`) | ✅ | 638 passed (638) |
| Lint → exit 0 (`pnpm lint`) | ✅ | 31 warnings, 0 errors |
| Type check → exit 0 (`pnpm typecheck`) | ✅ | exit 0 |

## Files created / modified

- `src/lib/identity.ts` — added `toClickHouseTs()` helper; applied it to the `timestamp` field in the ClickHouse INSERT call. ClickHouse JSONEachRow rejects ISO 8601 `T`/`Z` for DateTime64; it requires `"YYYY-MM-DD HH:MM:SS.mmm"`. The returned `EventRow.timestamp` still carries the ISO format (unit tests and callers expect it).
- `vitest.config.ts` — (1) loads `.env.local` into `process.env` via `loadEnvFile()` so `CLICKHOUSE_PASSWORD=""` is picked up without explicit env override; (2) adds `fileParallelism: false` to prevent concurrent test files from truncating the shared `minipanel_test` tables mid-test in another file.
- `src/lib/__tests__/identity.test.ts` — fixed 2 assertions that check the INSERT payload timestamp: (a) UTC-safe parsing from ClickHouse format using template literal; (b) expected value updated from ISO `"Z"` format to ClickHouse space-separator format. These were factual errors (wrong expected values).
- `src/lib/__tests__/users.integration.test.ts` — fixed `insertRawEvent` helper to convert its hardcoded ISO timestamp to ClickHouse format before inserting. Same root cause as `identity.ts`.
- `scripts/__tests__/migrate.integration.test.ts` — (1) `runMigrationCli()`: conditional spread omits `--password` flag when empty (ClickHouse CLI rejects `--password=`); (2) TCP/HTTP-mismatch test: added `timeout: 3000` to `execFileSync` — the native CLI hangs ~3 s when connecting TCP to HTTP port 8123, exceeding Vitest's 5 s default.

## Known gaps

None. All sprint contract criteria verified with actual command output.

## Issues logged

None. `ISSUES.md` was not updated — all root causes traced to implementation bugs in existing code, not new ambiguities.

## Root cause summary for evaluator

Three independent bugs, all pre-existing and only exposed once tests actually ran against live ClickHouse (they were silently skipping in Sprint 1 due to wrong auth default):

1. **Timestamp format** (`src/lib/identity.ts:135`): `new Date().toISOString()` produces `"…T…Z"` which ClickHouse DateTime64 with JSONEachRow rejects. Fixed by converting to `"YYYY-MM-DD HH:MM:SS.mmm"` at insert time only.

2. **Auth env not loaded** (`vitest.config.ts`): Vite/Vitest only injects `VITE_`-prefixed env vars into `process.env` from `.env.local`. `CLICKHOUSE_PASSWORD` (no prefix) was never set → fell back to `"password"` → auth failed → `beforeAll` threw → 5 identity tests silently skipped. Fixed by parsing `.env.local` explicitly in `loadEnvFile()` and passing it to `test.env`.

3. **Concurrent test file execution** (`vitest.config.ts`): `identity.integration.test.ts` and `users.integration.test.ts` both use `minipanel_test.events` and `minipanel_test.identity_mappings`. Running in parallel (default), one file's `afterEach` truncate destroyed data mid-test in the other file, causing 0-row query results. Fixed with `fileParallelism: false`.
