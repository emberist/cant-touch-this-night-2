# F19 Eval Sprint 1 — 2026-04-15

## Tests written

No new tests written by the evaluator. The four HTTP check criteria were integration gaps requiring a running dev server; they were verified directly with `curl` (see Phase B below). Playwright e2e was skipped — the existing `playwright_tests/example.spec.ts` targets playwright.dev and is not wired to a local server; the HTTP smoke checks are sufficient coverage for this feature.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `pnpm test` → 0 failures | 0 failures | 268 passed, 25 skipped, 0 failures | ✅ |
| `pnpm lint` → exit 0 | exit 0 | exit 0 (4 pre-existing `any` warnings, same as prior sprints) | ✅ |
| `pnpm typecheck` → exit 0 | exit 0 | exit 0 | ✅ |
| `pnpm build` → exit 0 | exit 0 | exit 0; `/` renders as `○` static, `/api/dashboard` as `ƒ` dynamic | ✅ |
| `src/app/api/dashboard/route.ts` exists and exports `GET` | file exists, exports `GET` | exists, exports `GET` | ✅ |
| `src/app/api/dashboard/__tests__/route.test.ts` exists | file exists | exists, 8 test cases all passing | ✅ |
| HTTP: `GET /api/dashboard` returns JSON with `total_events`, `total_users`, `top_event_7d` | keys present | `{"total_events":12000,"total_users":61,"top_event_7d":{"name":"Page Viewed","count":1049}}` | ✅ |
| HTTP: `GET /` contains `data-testid="metric-total-events"` | attribute present | present | ✅ |
| HTTP: `GET /` contains `data-testid="metric-total-users"` | attribute present | present | ✅ |
| HTTP: `GET /` contains `data-testid="metric-top-event"` | attribute present | present | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

- All ten sprint contract criteria pass.
- Unit tests are well-structured: cover success path, empty result set, zero counts, Error rejections, and non-Error rejections. No fixes needed.
- `page.tsx` runs the three queries inline (no redundant API hop), wraps in try/catch so the build succeeds without ClickHouse, and renders MUI `Card` components with the required `data-testid` attributes.
- `/api/dashboard` route correctly converts ClickHouse string counts to numbers before returning.
- The `top_event_7d: null` path is exercised both in unit tests and in the empty-DB case.
- HTTP check ran against a live ClickHouse + Next.js dev server (port 3099). Seed data was present from a prior sprint, confirming the full read path works end-to-end.
