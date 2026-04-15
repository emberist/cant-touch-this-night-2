# F25 Eval Sprint 1 — 2026-04-15

## Tests written

- `playwright_tests/users.spec.ts` — covers the two HTTP integration-gap criteria: `data-testid="users-search"` present in rendered `/users` page, `data-testid="users-table"` present in rendered `/users` page, plus a heading visibility check. Requires a running dev server (same pattern as `playwright_tests/trends.spec.ts`).

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| Test suite 0 failures | 0 failures | 0 failures (400 passed, 25 skipped) | ✅ |
| Linter → `pnpm lint` exits 0 | exit 0 | exit 0 (7 pre-existing warnings, 0 errors) | ✅ |
| Type check → `pnpm typecheck` exits 0 | exit 0 | exit 0 | ✅ |
| Build → `pnpm build` exits 0 | exit 0 | exit 0 (`/users` listed as ○ Static) | ✅ |
| `src/components/users/useUserSearch.ts` exists and exports `useUserSearch` | file exists + named export | present; exports `useUserSearch` and `UseUserSearchResult` | ✅ |
| `src/components/users/__tests__/useUserSearch.test.ts` exists | file exists | present; 14 unit tests | ✅ |
| `src/app/users/page.tsx` contains `"use client"` and imports `useUserSearch` | both present | `"use client"` at line 1; imports `useUserSearch` from `@/components/users/useUserSearch` | ✅ |
| HTTP: GET `/users` contains `data-testid="users-search"` | string in HTML | confirmed via curl against dev server on port 3099 | ✅ |
| HTTP: GET `/users` contains `data-testid="users-table"` | string in HTML | confirmed via curl against dev server on port 3099 | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

- The `data-testid="users-search"` attribute is placed on the inner `<input>` element via MUI v9's `slotProps.htmlInput`, not on the outer `TextField` wrapper. This is the correct approach for MUI v9 (the old `inputProps` was removed), and the attribute does appear in SSR'd HTML.
- The `useUserSearch.ts` hook carries a `"use client"` directive. This is technically optional for a hook module (the directive propagates from the importing component), but it is not harmful and correctly signals that the module uses browser APIs (`window.location.origin`).
- Playwright e2e tests (`playwright_tests/users.spec.ts`) require a running server (no `webServer` configured in `playwright.config.ts`), matching the convention of existing spec files.
