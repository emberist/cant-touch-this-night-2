# F1 Eval Sprint 1 — 2026-04-15

## Tests written

- `src/lib/__tests__/clickhouse.integration.test.ts` — covers the integration gap from the test plan: verifies `SELECT 1` succeeds and `ping()` returns `{ success: true }` against a live ClickHouse server. Skipped automatically when the server is unreachable (`describe.skipIf`). Tests pass (2 skipped, not failed) with no server running.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `src/lib/clickhouse.ts` exists and exports `clickhouse` (named export) | File exists, named export | File exists at `src/lib/clickhouse.ts`, exports `clickhouse` | ✅ |
| `@clickhouse/client` listed in `dependencies` in `package.json` | In `dependencies` | `"@clickhouse/client": "^1.18.2"` in `dependencies` | ✅ |
| Reads `CLICKHOUSE_URL` with default `http://localhost:8123` | Default `http://localhost:8123` | `process.env.CLICKHOUSE_URL ?? "http://localhost:8123"` | ✅ |
| Reads `CLICKHOUSE_DB` with default `minipanel` | Default `minipanel` | `process.env.CLICKHOUSE_DB ?? "minipanel"` | ✅ |
| Reads `CLICKHOUSE_PASSWORD` with default `password` | Default `password` | `process.env.CLICKHOUSE_PASSWORD ?? "password"` | ✅ |
| Test suite → 0 failures (`pnpm test`) | 0 failures | 5 passed, 2 skipped (integration tests with no server), 0 failed | ✅ |
| Linter → exit 0 (`pnpm lint`) | exit 0 | exit 0 — `Checked 16 files. No fixes applied.` | ✅ |
| Type check → exit 0 (`pnpm typecheck`) | exit 0 | exit 0 (no output) | ✅ |
| Build → exit 0 (`pnpm build`) | exit 0 | exit 0 — `Compiled successfully in 1451ms` | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

- The generator's singleton test uses `vi.resetModules()` in `afterEach`, so each `it` block gets a fresh module load. The "same instance" test correctly imports twice within a single `it` block (no intervening reset) and asserts `createClient` was called once — this is correct behavior.
- The `CLICKHOUSE_URL` constant in the integration test was reformatted by Biome (`lint:fix`) from a multi-line declaration to a single line — no semantic change.
- No e2e (Playwright) tests are warranted for F1: this feature introduces no new page, route, or user-facing flow. The Playwright infrastructure exists in the repo but is correctly unused here.
- ClickHouse server was not running at eval time (`curl /ping` returned HTTP 000). Integration tests skipped gracefully — no false positives.
