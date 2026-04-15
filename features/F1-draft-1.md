# F1 Sprint 1 — 2026-04-15

## Test files written

- `src/lib/__tests__/clickhouse.test.ts` — covers all sprint contract criteria:
  - exported `clickhouse` is defined and not null
  - client has a `query` method
  - singleton: same instance on multiple imports within the same module load (and `createClient` called exactly once)
  - default env var values (`http://localhost:8123`, `minipanel`, `password`) used when no env vars set
  - custom env var values override defaults

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| `src/lib/clickhouse.ts` exists and exports `clickhouse` (named export) | ✅ | File created, named export confirmed |
| `@clickhouse/client` listed in `dependencies` in `package.json` | ✅ | `"@clickhouse/client": "^1.18.2"` |
| Reads `CLICKHOUSE_URL`, `CLICKHOUSE_DB`, `CLICKHOUSE_PASSWORD` with correct defaults | ✅ | Tested via mocked `createClient` |
| Test suite → 0 failures (`pnpm test`) | ✅ | 5 passing, 0 failing |
| Linter → exit 0 (`pnpm lint`) | ✅ | `Checked 15 files. No fixes applied.` |
| Type check → exit 0 (`pnpm typecheck`) | ✅ | No output (clean) |
| Build → exit 0 (`pnpm build`) | ✅ | Compiled successfully |

## Files created / modified

- `src/lib/__tests__/clickhouse.test.ts` — new: unit tests for the clickhouse singleton
- `src/lib/clickhouse.ts` — new: singleton client created via `createClient` with env-based config
- `package.json` — `@clickhouse/client` added to `dependencies` by `pnpm add`
- `pnpm-lock.yaml` — updated by pnpm

## Known gaps

None. All sprint contract criteria pass.

## Issues logged

None.
