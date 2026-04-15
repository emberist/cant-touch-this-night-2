# F32 Eval Sprint 1 — 2026-04-15

## Tests written

No new test files were written. The identity integration test file already existed and was not modified by the generator. No integration gaps were left uncovered by that file — all 4 BR-101 scenarios are present, structurally correct, and test the right assertions.

- `src/lib/__tests__/identity.integration.test.ts` — covers all 4 BR-101 scenarios (verified by reading the file)

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| File `src/lib/__tests__/identity.integration.test.ts` exists | file exists | file exists | ✅ |
| BR-101 S1: anonymous event → identify → retroactive merge | test at line 98 | present — `insertEvent` + `queryEventsWithResolvedId` with correct assertions | ✅ |
| BR-101 S2: two devices linked to same user → events from both returned | test at line 128 | present — two `insertEvent` calls + `getEventsByResolvedId` with `deviceIds` assertion | ✅ |
| BR-101 S3: device mapped to two different users → `IdentityConflictError` with status 409 | tests at lines 159, 183 | present — two separate tests, one for throw type, one for `.status === 409` | ✅ |
| BR-101 S4: same device + same user sent twice → no error (idempotent) | test at line 210 | present — resolves without throw, both events stored | ✅ |
| Tests use `minipanel_test` database (not `minipanel`) | `TEST_DB = "minipanel_test"` | line 19: `const TEST_DB = "minipanel_test"` — `testClient` uses it at line 33–37 | ✅ |
| Tests create database and tables in `beforeAll` (idempotent) | `CREATE ... IF NOT EXISTS` | lines 42–84: `CREATE DATABASE IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS` for both tables | ✅ |
| Tests truncate tables in `afterEach` for isolation | `TRUNCATE TABLE events` + `TRUNCATE TABLE identity_mappings` | lines 91–95: both tables truncated | ✅ |
| Test suite → 0 failures (`pnpm test`) | 0 failures | **22 failures with `CLICKHOUSE_PASSWORD=""`; 10 failures + 5 identity tests skipped with default password** | ❌ |
| Lint → exit 0 (`pnpm lint`) | exit 0 | exit 0 (31 warnings, 0 errors) | ✅ |
| Type check → exit 0 (`pnpm typecheck`) | exit 0 | exit 0 | ✅ |

## Score: 5/10

## Verdict: NEEDS_WORK

## Feedback for next sprint

| Criterion | Error | File:Line | Action |
|-----------|-------|-----------|--------|
| Test suite → 0 failures | `Cannot parse input: expected '"' before: 'Z","device_id":"dev-s1","user_id":null,"properties":"{}"}: (while reading the value of key timestamp): (at row 1)` | `src/lib/identity.ts:135` | `new Date().toISOString()` produces `"2026-04-15T19:02:13.837Z"`. ClickHouse DateTime64 with JSONEachRow does not accept the `T` separator or the `Z` suffix. Fix: replace `input.timestamp ?? new Date().toISOString()` with a helper that converts to `"YYYY-MM-DD HH:MM:SS.mmm"` format. Simplest: `(input.timestamp ?? new Date().toISOString()).replace('T', ' ').replace(/Z$/, '')`. Apply the same fix everywhere `insertEvent` or any other code formats timestamps for ClickHouse inserts. |
| Test suite → 0 failures (secondary: password env) | `ClickHouseError: default: Authentication failed: password is incorrect, or there is no user with such name` — `beforeAll` throws, all 5 identity tests skip, file marked FAIL | `src/lib/__tests__/identity.integration.test.ts:44` | The local ClickHouse server has an empty password; the test client defaults to `password: "password"`. Ensure `.env.local` contains `CLICKHOUSE_PASSWORD=` (empty value) OR configure the local ClickHouse instance with `password=password`. The `isClickHouseReachable()` function only checks `/ping` (no auth required), so it returns `true` even when the password is wrong — tests are not guarded by `describe.skipIf` and instead skip silently when `beforeAll` throws. Verify by running `CLICKHOUSE_PASSWORD="" pnpm test` to confirm the 5 tests execute (not skip). |

## Notes

### How the generator's "0 failures" was a false pass

`isClickHouseReachable()` fetches `/ping` with no credentials. This endpoint returns `Ok.` regardless of password. So `describe.skipIf` does **not** skip when ClickHouse is running with the wrong password. The tests are entered, `beforeAll` fires, the `adminClient.command()` call fails with `AUTHENTICATION_FAILED`, and Vitest marks all 5 inner tests as *skipped* (not *failed*). The file is marked FAIL in the output, but the test count shows `5 tests | 5 skipped`. The generator evaluated without ClickHouse running at all (all 25 integration tests skipped cleanly from the `isClickHouseReachable() === false` guard), which made the suite show 0 failures.

### Timestamp bug is in production code, not the test file

The test file is structurally correct. All 4 scenarios are present with the right assertions. The failing criterion traces to `src/lib/identity.ts:135` where `new Date().toISOString()` emits `Z`-suffixed ISO 8601 that ClickHouse DateTime64 rejects. This is an F4 production code bug exposed only when the tests actually run against a live server.

### Other pre-existing failures (not F32)

When ClickHouse is running with the correct empty password, `pnpm test` also shows failures in:
- `scripts/__tests__/migrate.integration.test.ts` (6 failures: password mismatch, port mismatch)
- `src/lib/__tests__/clickhouse.integration.test.ts` (1 failure: password mismatch)

These are pre-F32 failures. Fix the password env issue (`.env.local` `CLICKHOUSE_PASSWORD=`) and they should resolve alongside the identity tests.
