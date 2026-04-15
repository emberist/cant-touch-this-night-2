# F33 Eval Sprint 1 — 2026-04-15

## Tests written

No new integration/e2e tests were written by the evaluator. The deliverable IS the Playwright test files (this feature has no unit-testable logic), and all acceptance criteria are covered by the generator's files. The "integration gap" criteria require a running ClickHouse instance and cannot be mechanically verified in this eval pass; they are noted under Notes below.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `playwright_tests/test-page.spec.ts` exists | file present | present | ✅ |
| `playwright_tests/explore.spec.ts` exists | file present | present | ✅ |
| `playwright_tests/identity.spec.ts` exists | file present | present | ✅ |
| `playwright_tests/example.spec.ts` does NOT exist | absent | absent | ✅ |
| `trends.spec.ts` contains `/api/seed` call + chart data test | present | present (line 36, line 40–63) | ✅ |
| `funnels.spec.ts` contains 3-step funnel + conversion verification | present | present (lines 69–108) | ✅ |
| `playwright.config.ts` has `baseURL: "http://localhost:3000"` | present | `baseURL: "http://localhost:3000"` (line 22) | ✅ |
| `playwright.config.ts` has `webServer` block | present | present (lines 35–40) | ✅ |
| `pnpm typecheck` → exit 0 | exit 0 | exit 0 | ✅ |
| `pnpm lint` → exit 0 | exit 0 | exit 0 (31 warnings, 0 errors) | ✅ |
| `pnpm build` → exit 0 | exit 0 | exit 0 (all 23 routes compiled) | ✅ |
| `pnpm test` → 0 failures | 0 failures | 638 passing, 0 failures | ✅ |
| Playwright tests pass (requires ClickHouse) | all pass | not runnable without live CH | integration gap |

## Score: 8/10

## Verdict: APPROVED

## Notes

### Test ID correctness (verified by grep)

All `data-testid` values used in the test files were confirmed to exist in the production components:

| Test ID | Component | Line |
|---------|-----------|------|
| `trend-chart`, `trend-chart-skeleton`, `trend-chart-empty` | `TrendChart.tsx` | 163, 170 |
| `funnel-chart`, `funnel-chart-steps`, `funnel-dropoff` | `FunnelChart.tsx` | confirmed |
| `user-profile`, `identity-cluster` | `src/app/users/[id]/page.tsx` | confirmed |
| `quick-fire-buttons`, `event-card` | referenced in plan; matching components confirmed |

Filter label `"Filter by event name"` in `explore.spec.ts` matches `EventFilterBar.tsx:36`. Event name label `"Event name"` in `trends.spec.ts` matches `TrendsControls.tsx:107`.

### BR-101 Scenario 1 deviation (documented, acceptable)

The plan specified clicking "Anonymous Page View" 4× via UI. Each click generates a **new** random `device_id`; only the last device is linked by "Identify User". The generator correctly identified this constraint and:
- Used the API directly in the main BR-101 test to control the `device_id` (sends 4 events + 1 identify for the same device, asserts 5 events in profile).
- Kept a UI smoke-test that fires the buttons and verifies the user profile loads without asserting a specific count.

This is a valid architectural decision. The API-level test verifies BR-101 correctness; the UI smoke-test verifies the button wiring.

### Parallel seeding race (known gap, documented)

`trends.spec.ts` and `funnels.spec.ts` each have `beforeAll` blocks calling `POST /api/seed`, which clears all data. With `fullyParallel: true`, both files can run concurrently, and one seed can wipe the other's data mid-test. The config sets `workers: process.env.CI ? 1 : undefined`, so CI runs are safe. Local parallel runs may be flaky. Acceptable for current scope; flagged in generator's known gaps.

### Trends data-driven test: minor timing consideration

The test pattern `await expect(skeleton).not.toBeVisible({ timeout: 15000 })` followed by `await expect(empty).not.toBeVisible()` is correct but has a theoretical false positive: if Playwright checks `not.toBeVisible(skeleton)` before the skeleton appears (fetch not yet triggered), it passes immediately. The second check (`not.toBeVisible(empty)`) still provides a correctness backstop — if loading is in progress, `empty` won't render; if loading failed, `empty` will render and the assertion will fail. In practice this pattern is acceptable and standard.

### "Event Timeline (5 events)" text assertion

`identity.spec.ts:68` checks `/event timeline \(5 events\)/i`. Confirmed that `src/app/users/[id]/page.tsx:147` renders `Event Timeline ({profile.events.length} events)`, which will produce "Event Timeline (5 events)" for 5 events. ✅
