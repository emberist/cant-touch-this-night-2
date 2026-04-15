# F27 Eval Sprint 1 — 2026-04-15

## Tests written

No new integration/e2e tests written. The plan's only stated integration gap was "HTTP checks for `/test` page rendering — requires dev server." This was verified in Phase B (HTTP checks) rather than as a persistent test file, since the check is purely structural (testid attribute presence in static HTML).

Playwright infrastructure exists in the project but no e2e tests were written for this feature: the interactive flows (anonymous → identify → verify) require a live ClickHouse backend and are covered by the manual verification scenarios in SPEC.md §11.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `pnpm typecheck` exits 0 | exit 0 | exit 0 | ✅ |
| `pnpm lint` exits 0 | exit 0 | exit 0 (7 pre-existing warnings in seed.test.ts, 0 in new files) | ✅ |
| `pnpm build` exits 0 | exit 0 | exit 0 | ✅ |
| `pnpm test` exits with 0 failures | 0 failures | 454 passing, 25 skipped, 0 failures | ✅ |
| `src/components/test/useEventSender.ts` exports `useEventSender` | export present | `export function useEventSender()` at line 41 | ✅ |
| `src/components/test/QuickFireButtons.tsx` exports `QuickFireButtons` | export present | present | ✅ |
| `src/components/test/CustomEventForm.tsx` exports `CustomEventForm` | export present | present | ✅ |
| `src/components/test/SeedDataButton.tsx` exports `SeedDataButton` | export present | present | ✅ |
| `src/app/test/page.tsx` imports from `@/components/test/QuickFireButtons` | import present | present | ✅ |
| `src/app/test/page.tsx` imports from `@/components/test/CustomEventForm` | import present | present | ✅ |
| `src/app/test/page.tsx` imports from `@/components/test/SeedDataButton` | import present | present | ✅ |
| HTTP: GET `/test` contains `data-testid="quick-fire-buttons"` | present in HTML | present | ✅ |
| HTTP: GET `/test` contains `data-testid="custom-event-form"` | present in HTML | present | ✅ |
| HTTP: GET `/test` contains `data-testid="seed-data-button"` | present in HTML | present | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

- The right panel renders "Live Feed coming soon" as a placeholder, per the plan. This is correct for F27 scope.
- `page.tsx` uses `"use client"` implicitly via `useEventSender` — the file does not have a `"use client"` directive at the top, but the build succeeds because it renders as a static page (`○ /test` in build output). This works but is worth noting: if the page were to use any RSC features later, it would need the directive added explicitly.
- Unit tests in `useEventSender.test.ts` and component tests are well-structured and cover all spec-required behaviour including the anonymous → button click → identify device_id threading.
- The 7 lint warnings are all pre-existing in `src/lib/__tests__/seed.test.ts` and are not attributable to this feature.
