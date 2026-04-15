# F3 Plan

## Acceptance criteria

From SPEC.md §10 ("Integrated dev script"):

- `package.json` `dev` script uses `concurrently` to run both `./clickhouse server -- --path=.clickhouse` and `next dev` together, with labels `-n CH,NEXT` and colors `-c cyan,green`.
- `concurrently` is listed as a `devDependency` (`^9.0.0`).
- `predev` hook runs `tsx scripts/migrate.ts` before the dev script (already in place from F2).
- `concurrently` forwards Ctrl+C to both processes.
- Running `pnpm dev` starts both ClickHouse and Next.js together.

## Dependencies

- **F1** (`features/F1-done.md`): ClickHouse client singleton at `src/lib/clickhouse.ts`.
- **F2** (`features/F2-done.md`): Migration script at `scripts/migrate.ts` + `scripts/schema.sql`, `predev` hook already wired in `package.json`.

No source files are imported or extended — this feature only modifies `package.json`.

## Files to create or modify

- MODIFY `package.json` — change `dev` script to use `concurrently`; add `concurrently` to `devDependencies`.

## Implementation order

1. Add `concurrently` (`^9.0.0`) to `devDependencies` in `package.json`.
2. Change the `dev` script from `"next dev"` to `"concurrently -n CH,NEXT -c cyan,green \"./clickhouse server -- --path=.clickhouse\" \"next dev\""`.
3. Run `pnpm install` to install the new dependency and update the lockfile.

## Sprint contract

- [ ] File check: `package.json` contains `"concurrently"` in `devDependencies` with version `^9.0.0`
- [ ] File check: `package.json` `dev` script value is `concurrently -n CH,NEXT -c cyan,green "./clickhouse server -- --path=.clickhouse" "next dev"`
- [ ] File check: `package.json` `predev` script value is `tsx scripts/migrate.ts` (unchanged from F2)
- [ ] File check: `pnpm-lock.yaml` contains `concurrently` (dependency installed)
- [ ] Type check: `pnpm typecheck` exits 0
- [ ] Lint check: `pnpm lint` exits 0
- [ ] Build check: `pnpm build` exits 0

## Test plan

No unit tests are warranted for this feature. The change is purely declarative configuration in `package.json` (two JSON field edits + a dependency addition). There is no business logic, no functions, no modules under test. Correctness is fully covered by the file checks and build/lint/type checks in the sprint contract.

- **Integration gap**: verifying that `pnpm dev` actually starts both ClickHouse and Next.js concurrently requires running the dev server and observing process output — this is a manual/e2e verification.

## Risks and open questions

None. This is a straightforward `package.json` configuration change. The `concurrently` package handles Ctrl+C forwarding by default — no additional configuration is needed.
