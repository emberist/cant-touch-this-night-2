# F1 Plan

## Acceptance criteria

From SPEC.md §9 — ClickHouse Client Setup:

- `src/lib/clickhouse.ts` exports a singleton client created via `createClient` from `@clickhouse/client`.
- Client is configured with three environment variables, each with a default:
  - `CLICKHOUSE_URL` → defaults to `http://localhost:8123`
  - `CLICKHOUSE_DB` → defaults to `minipanel`
  - `CLICKHOUSE_PASSWORD` → defaults to `password`
- The `@clickhouse/client` package is installed as a dependency.

## Dependencies

No prior features required — no `features/F*-done` sentinel files exist.

No existing `src/lib/` files to import or extend — the directory does not yet exist.

## Files to create or modify

- MODIFY `package.json` — add `@clickhouse/client` dependency (via `pnpm add`)
- CREATE `src/lib/clickhouse.ts` — singleton ClickHouse client with env-based configuration

## Implementation order

1. Install `@clickhouse/client` as a dependency (`pnpm add @clickhouse/client`).
2. Create `src/lib/clickhouse.ts` exporting the singleton `clickhouse` client, using `createClient` from `@clickhouse/client` with the three env vars and their defaults per SPEC.md §9.
3. Write a Vitest unit test at `src/lib/__tests__/clickhouse.test.ts` verifying the module exports the client correctly.

## Sprint contract

- [ ] File `src/lib/clickhouse.ts` exists and exports `clickhouse` (named export)
- [ ] `@clickhouse/client` is listed in `dependencies` in `package.json`
- [ ] `src/lib/clickhouse.ts` reads `CLICKHOUSE_URL`, `CLICKHOUSE_DB`, and `CLICKHOUSE_PASSWORD` from `process.env` with correct defaults (`http://localhost:8123`, `minipanel`, `password`)
- [ ] Test suite → 0 failures (`pnpm test`)
- [ ] Linter → exit 0 (`pnpm lint`)
- [ ] Type check → exit 0 (`pnpm typecheck`)
- [ ] Build → exit 0 (`pnpm build`)

## Test plan

- **Test file**: `src/lib/__tests__/clickhouse.test.ts`
- **Module under test**: `@/lib/clickhouse` — named export `clickhouse`
- **Cases to cover**:
  - `clickhouse` is exported and is defined (not null/undefined)
  - `clickhouse` is an instance of the ClickHouse client (has expected methods like `query`)
  - Module-level singleton: importing twice returns the same reference

Note: These tests verify the module shape and singleton behavior. They do NOT require a running ClickHouse server — they test that the client object is correctly instantiated and exported. If the `@clickhouse/client` `createClient` throws when the server is unreachable at import time, the tests should mock `createClient` or use `vi.mock` to isolate from network. Verify behavior by checking the client is constructed with the expected config.

- **Integration gap**: Verifying actual ClickHouse connectivity (e.g., running a `SELECT 1` query) requires a running ClickHouse server — not covered by unit tests.

## Risks and open questions

- The `@clickhouse/client` `createClient` function may or may not eagerly connect on instantiation. If it does, unit tests will need to mock the module to avoid requiring a running ClickHouse. The test plan accounts for this with `vi.mock`.
- The SPEC shows `password` in the `createClient` config. The `@clickhouse/client` API may use `password` or `credentials` — verify against the installed package's types.
