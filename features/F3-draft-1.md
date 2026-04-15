# F3 Sprint 1 — 2026-04-15

## Test files written

None — the test plan explicitly states no unit tests are warranted for this feature. The change is purely declarative configuration in `package.json` with no business logic or testable modules.

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| `package.json` contains `"concurrently"` in `devDependencies` with version `^9.0.0` | ✅ | `"concurrently": "^9.0.0"` |
| `package.json` `dev` script value is `concurrently -n CH,NEXT -c cyan,green "./clickhouse server -- --path=.clickhouse" "next dev"` | ✅ | Exact match confirmed |
| `package.json` `predev` script value is `tsx scripts/migrate.ts` | ✅ | Unchanged from F2 |
| `pnpm-lock.yaml` contains `concurrently` | ✅ | 3 occurrences; `concurrently 9.2.1` installed |
| `pnpm typecheck` exits 0 | ✅ | No type errors |
| `pnpm lint` exits 0 | ✅ | 19 files checked, no errors (fixed pre-existing format issue in `scripts/__tests__/migrate.integration.test.ts`) |
| `pnpm build` exits 0 | ✅ | Compiled successfully |
| test suite 0 failures | ✅ | 11 passing, 11 skipped (integration tests skipped without live CH) |

## Files created / modified

- `package.json` — added `"concurrently": "^9.0.0"` to `devDependencies`; changed `dev` script to use `concurrently`
- `pnpm-lock.yaml` — updated by `pnpm install` to include `concurrently 9.2.1` and its transitive deps
- `scripts/__tests__/migrate.integration.test.ts` — auto-fixed pre-existing Biome line-length formatting issue (not related to F3)

## Known gaps

None. All sprint contract criteria pass.

## Issues logged

None.
