# F20 Eval Sprint 1 — 2026-04-15

## Tests written

- `src/components/explore/__tests__/EventFilterBar.test.tsx` — covers integration gap: EventFilterBar calls `/api/schema` on mount, renders the combobox input, and does not crash when the fetch fails

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `pnpm test` 0 failures | 0 failures | 295 passing, 25 skipped, 0 failing | ✅ |
| `pnpm lint` exit 0 | exit 0 | exit 0 (4 pre-existing warnings in `seed.test.ts`) | ✅ |
| `pnpm typecheck` exit 0 | exit 0 | exit 0 | ✅ |
| `pnpm build` exit 0 | exit 0 | exit 0 | ✅ |
| `src/components/ui/JsonChip.tsx` exports `JsonChip` | named export | confirmed | ✅ |
| `src/components/ui/IdentityChip.tsx` exports `IdentityChip` | named export | confirmed | ✅ |
| `src/components/EventTable.tsx` exports `EventTable` | named export | confirmed | ✅ |
| `src/components/explore/EventFilterBar.tsx` exports `EventFilterBar` | named export | confirmed | ✅ |
| `src/components/explore/useEventExplorer.ts` exports `useEventExplorer` | named export | confirmed | ✅ |
| `src/app/explore/page.tsx` imports `EventTable` | import present | confirmed | ✅ |
| HTTP GET `/explore` contains `Event Explorer` | present | present | ✅ |
| HTTP GET `/explore` contains `data-testid="event-table"` | present | present | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

- `IdentityChip.tsx` has no `"use client"` directive. This is acceptable: the component uses no React hooks or browser APIs, and is only ever imported from `EventTable` which is already a client component. Build passes with no warnings.
- Lint on the newly created `EventFilterBar.test.tsx` had a formatting issue (long line). Fixed with `biome format --write` before the final lint pass.
- Integration gap for IntersectionObserver-triggered `loadMore` remains untested. This requires a real browser with Playwright + a live ClickHouse instance. No Playwright test was written since the baseline `playwright_tests/example.spec.ts` has no `baseURL` configured and ClickHouse is not available in the eval environment. The unit tests for `useEventExplorer` cover the `loadMore` logic; the browser-level wiring is the only gap.
- The 4 lint warnings are pre-existing `noExplicitAny` usages in `src/lib/__tests__/seed.test.ts`; no new warnings introduced by F20.
