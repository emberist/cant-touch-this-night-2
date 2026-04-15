# F18 Eval Sprint 1 — 2026-04-15

## Tests written

None. The test plan for this feature explicitly excludes unit tests (no module-under-test beyond third-party rendering). No integration/e2e test files were written — this is the first sprint, and the feature is purely presentational UI with no business logic. The sprint contract criteria are fully covered by static checks and HTTP checks performed below.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `pnpm typecheck` exits 0 | exit 0 | exit 0, 0 errors | ✅ |
| `pnpm lint` exits 0 | exit 0 | exit 0, 4 pre-existing warnings in `seed.test.ts`, 0 in new files | ✅ |
| `pnpm build` exits 0 | exit 0 | exit 0, all 14 routes built | ✅ |
| `pnpm test` exits 0 | 0 failures | 260 passed, 25 skipped, 0 failures | ✅ |
| `src/components/Sidebar.tsx` exists | file present | present, exports default `Sidebar` | ✅ |
| `src/app/explore/page.tsx` exists | file present | present, exports default component | ✅ |
| `src/app/trends/page.tsx` exists | file present | present, exports default component | ✅ |
| `src/app/funnels/page.tsx` exists | file present | present, exports default component | ✅ |
| `src/app/users/page.tsx` exists | file present | present, exports default component | ✅ |
| `src/app/test/page.tsx` exists | file present | present, exports default component | ✅ |
| `src/app/generate/page.tsx` exists | file present | present, exports default component | ✅ |
| GET `/` contains `Dashboard` | present | present | ✅ |
| GET `/` contains `Explore` | present | present | ✅ |
| GET `/` contains `Trends` | present | present | ✅ |
| GET `/` contains `Funnels` | present | present | ✅ |
| GET `/` contains `Users` | present | present | ✅ |
| GET `/` contains `Test` | present | present | ✅ |
| GET `/` contains `Generate` | present | present | ✅ |
| GET `/explore` contains `Explore` | present | present | ✅ |
| GET `/trends` contains `Trends` | present | present | ✅ |
| GET `/funnels` contains `Funnels` | present | present | ✅ |
| GET `/users` contains `Users` | present | present | ✅ |
| GET `/test` contains `Test` | present | present | ✅ |
| GET `/generate` contains `Generate` | present | present | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

- **`pnpm dev` requires ClickHouse to be running first.** The `predev` hook runs `tsx scripts/migrate.ts`, which connects to ClickHouse. If ClickHouse is not running, the migration fails and `concurrently` never starts. HTTP checks were verified by starting ClickHouse (`./clickhouse server -- --path=.clickhouse`) manually before running `pnpm exec next dev`. This is a project-level environment constraint, not a bug introduced by F18.
- `Sidebar.tsx` correctly uses `"use client"`, `usePathname()` for active-route highlighting, and `LinkComponent={NextLink}` for client-side navigation. Implementation matches the plan.
- The 4 lint warnings are pre-existing in `src/lib/__tests__/seed.test.ts` and are unrelated to F18.
- No e2e tests were warranted: the feature introduces stub pages with no business logic, and active-route highlighting (the only dynamic behavior) is a trivial `pathname === href` comparison. Writing e2e tests here would test MUI's `selected` prop, not application code.
