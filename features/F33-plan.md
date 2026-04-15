# F33 Plan

## Acceptance criteria

From SPEC.md §11 (Integration tests — Playwright):

1. `test-page.spec.ts`: fire a quick-fire event via Testing page, verify it appears in Live Feed within 3 seconds.
2. `explore.spec.ts`: seed data, open Explorer, filter by event name, verify results.
3. `trends.spec.ts`: seed data, open Trends, select event + measure, verify chart renders with data.
4. `funnels.spec.ts`: build a 3-step funnel, verify conversion rates are non-zero.
5. `identity.spec.ts`: simulate anonymous → identify flow via Testing page, look up user profile, verify merged timeline.

From SPEC.md §11 (Manual verification scenarios):

6. **BR-101 Scenario 1**: Use Testing page → fire "Anonymous Page View" 4× → fire "Identify User" → open `/users/test@example.com` → verify 5 events.
7. **BR-101 Scenario 2**: Use Custom Event Form to link two devices to same user → verify both sets of events in profile.

## Dependencies

All features F1–F32 are complete (all `features/F*-done` sentinels through F32 exist).

Key files that tests will exercise (not modify):
- `src/app/test/page.tsx` — Testing page
- `src/app/explore/page.tsx` — Explorer page
- `src/app/trends/page.tsx` — Trends page
- `src/app/funnels/page.tsx` — Funnels page
- `src/app/users/page.tsx` — Users search page
- `src/app/users/[id]/page.tsx` — User profile page
- `src/components/test/QuickFireButtons.tsx` — Quick-fire buttons (testid: `quick-fire-buttons`)
- `src/components/test/LiveFeed.tsx` — Live feed (testid: `event-card`)
- `src/components/test/CustomEventForm.tsx` — Custom event form (testid: `custom-event-form`)
- `src/components/test/SeedDataButton.tsx` — Seed button (testid: `seed-data-button`)
- `src/components/EventTable.tsx` — Event table (testid: `event-table`)
- `src/components/TrendChart.tsx` — Trend chart (testid: `trend-chart`)
- `src/components/FunnelChart.tsx` — Funnel chart (testid: `funnel-chart`, `funnel-chart-steps`)
- `src/components/trends/TrendsControls.tsx` — Trends controls (testid: `trends-controls`)
- `src/components/funnels/StepBuilder.tsx` — Step builder (testid: `step-builder`)
- `src/components/funnels/FunnelDateRange.tsx` — Date range (testid: `funnel-date-range`)
- `src/components/UserTimeline.tsx` — User timeline (testid: `user-timeline`)
- `src/app/api/events/route.ts` — Event ingestion API
- `src/app/api/seed/route.ts` — Seed API
- `src/app/api/live/route.ts` — SSE live feed API
- `playwright.config.ts` — Playwright configuration

Existing Playwright test files (will be replaced/extended):
- `playwright_tests/trends.spec.ts` — basic structural tests only, needs data-driven tests
- `playwright_tests/funnels.spec.ts` — basic structural tests only, needs data-driven tests
- `playwright_tests/users.spec.ts` — basic structural tests (keep as-is or augment)
- `playwright_tests/user-profile.spec.ts` — basic structural tests (keep as-is or augment)
- `playwright_tests/example.spec.ts` — default Playwright scaffold (remove)
- `playwright_tests/generate.spec.ts` — F31 tests (keep as-is)

## Files to create or modify

- MODIFY `playwright.config.ts` — Enable `baseURL: 'http://localhost:3000'` and `webServer` config so tests auto-start the dev server
- CREATE `playwright_tests/test-page.spec.ts` — Testing page e2e tests (AC #1)
- CREATE `playwright_tests/explore.spec.ts` — Explorer page e2e tests (AC #2)
- MODIFY `playwright_tests/trends.spec.ts` — Add data-driven tests on top of existing structural tests (AC #3)
- MODIFY `playwright_tests/funnels.spec.ts` — Add data-driven 3-step funnel test (AC #4)
- CREATE `playwright_tests/identity.spec.ts` — Identity resolution e2e tests (AC #5, #6, #7)
- DELETE `playwright_tests/example.spec.ts` — Remove default Playwright scaffold (irrelevant to project)

## Implementation order

1. **Update `playwright.config.ts`** — Uncomment/configure `baseURL` to `http://localhost:3000`. Configure `webServer` to run `pnpm dev` with appropriate startup URL and timeout. Reduce projects to chromium-only for speed (the spec does not require cross-browser). Set reasonable test timeout (e.g. 60s) since tests involve ClickHouse queries and SSE waits.

2. **Create `playwright_tests/test-page.spec.ts`** — Tests for the Testing page:
   - Navigate to `/test`, verify "Test" heading visible.
   - Verify left panel (quick-fire buttons) and right panel (Live Feed) are visible.
   - Click "Anonymous Page View" quick-fire button, wait for "Sent" feedback.
   - Verify an event card appears in Live Feed within 3 seconds (AC #1).
   - Click "Signup" button, verify it sends successfully.

3. **Create `playwright_tests/explore.spec.ts`** — Tests for the Explorer page:
   - Seed data via `POST /api/seed` (using `page.request` or fetch in `beforeAll`).
   - Navigate to `/explore`, verify "Event Explorer" heading.
   - Verify `event-table` is visible and contains rows.
   - Use the event name filter dropdown to select "Purchase Completed".
   - Verify filtered results only show "Purchase Completed" events (AC #2).

4. **Modify `playwright_tests/trends.spec.ts`** — Add data-driven tests:
   - Add a `beforeAll` that seeds data via API.
   - Add test: select "Page Viewed" event, "count" measure, verify chart renders with data points (not empty/skeleton) (AC #3).
   - Keep existing structural tests intact.

5. **Modify `playwright_tests/funnels.spec.ts`** — Add 3-step funnel test:
   - Add a `beforeAll` that seeds data via API.
   - Add test: select 3 events in step builder (Page Viewed → Signup Completed → Purchase Completed), click "Run Funnel", verify `funnel-chart-steps` appears with non-zero conversion rates (AC #4).
   - Keep existing structural tests intact.

6. **Create `playwright_tests/identity.spec.ts`** — Identity resolution e2e tests:
   - **Test A (AC #5, #6 — BR-101 Scenario 1)**: Navigate to `/test`. Click "Anonymous Page View" 4 times (waiting for "Sent" each time). Click "Identify User". Navigate to `/users/test@example.com`. Verify the user profile loads with identity cluster showing "test@example.com". Verify user timeline shows ≥5 events (4 anonymous + 1 identify).
   - **Test B (AC #7 — BR-101 Scenario 2)**: Use the custom event form to send events from device-A with user@example.com, then send events from device-B with user@example.com. Navigate to user profile. Verify identity cluster contains both device-A and device-B.

7. **Delete `playwright_tests/example.spec.ts`** — Remove the default Playwright demo test that hits playwright.dev.

## Sprint contract

- [ ] File `playwright_tests/test-page.spec.ts` exists
- [ ] File `playwright_tests/explore.spec.ts` exists
- [ ] File `playwright_tests/identity.spec.ts` exists
- [ ] File `playwright_tests/example.spec.ts` does NOT exist
- [ ] File `playwright_tests/trends.spec.ts` contains a test that calls `/api/seed` and verifies chart data
- [ ] File `playwright_tests/funnels.spec.ts` contains a test with 3 funnel steps and conversion verification
- [ ] `playwright.config.ts` has `baseURL` set to `http://localhost:3000`
- [ ] `playwright.config.ts` has a `webServer` configuration block
- [ ] Type check → exit 0: `pnpm typecheck`
- [ ] Lint → exit 0: `pnpm lint`
- [ ] Build → exit 0: `pnpm build`
- [ ] Unit test suite → 0 failures: `pnpm test`
- [ ] Playwright tests pass with dev server: `pnpm exec playwright test --project=chromium` (requires running ClickHouse)

## Test plan

This feature IS the test suite — the deliverable is Playwright e2e test files. There is no business logic code being written, so there are no unit tests to create.

All acceptance criteria are verified by running the Playwright tests themselves:

- **Integration gap**: `test-page.spec.ts` — quick-fire event appears in Live Feed within 3s (requires running dev server + ClickHouse)
- **Integration gap**: `explore.spec.ts` — seed data visible in explorer, filter works (requires running dev server + ClickHouse)
- **Integration gap**: `trends.spec.ts` — chart renders with data after seeding (requires running dev server + ClickHouse)
- **Integration gap**: `funnels.spec.ts` — 3-step funnel shows non-zero conversions (requires running dev server + ClickHouse)
- **Integration gap**: `identity.spec.ts` — anonymous → identify flow produces merged user profile (requires running dev server + ClickHouse)

No unit tests are appropriate for this feature since the entire deliverable is integration/e2e tests.

## Risks and open questions

1. **Test isolation**: Each test that fires events or seeds data may pollute state for other tests. The seed endpoint (`POST /api/seed`) clears existing data before inserting, so tests that need a clean slate should call seed in `beforeAll`/`beforeEach`. The identity tests need careful ordering or unique identifiers to avoid 409 conflicts from prior runs.

2. **SSE timing in Live Feed test**: The spec says "verify it appears in Live Feed within 3 seconds." The SSE endpoint polls ClickHouse every 1 second, so we need to account for: event insert latency + SSE poll interval + client render. A `waitForSelector` with a 5-second timeout is safer than a hard 3-second assertion.

3. **ClickHouse availability**: All Playwright tests require a running ClickHouse instance. The `webServer` config in `playwright.config.ts` can start `pnpm dev` which starts both ClickHouse and Next.js, but the ClickHouse binary must already be downloaded. Tests will fail if ClickHouse is not present.

4. **Quick-fire button device ID randomness**: The "Anonymous Page View" button generates a new random `device_id` each click, but "Identify User" uses `lastDeviceId` from the hook. The identity test (AC #6) depends on clicking "Anonymous Page View" first to establish a `lastDeviceId`, then "Identify User" to link it. If the hook state is lost between clicks, the test will fail — need to verify this flow works end-to-end.

5. **Existing test augmentation**: The existing `trends.spec.ts` and `funnels.spec.ts` use `const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000"` while the new config adds `baseURL`. The existing tests should be migrated to use relative URLs (e.g., `page.goto('/trends')`) for consistency once `baseURL` is configured.
