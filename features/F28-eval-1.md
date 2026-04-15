# F28 Eval Sprint 1 — 2026-04-15

## Tests written

No new test files written. The integration gap noted in the plan was HTTP checks for `/test` page rendering — verified manually in Phase B below (no persistent test file required for this criterion type). Existing unit test coverage was comprehensive and correct; no factual errors found in generator-written tests.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| Test suite 0 failures | 0 failures | 478 passing, 25 skipped, 0 failing | ✅ |
| Linter exit 0 | exit 0 | exit 0 (17 warnings, all style-only) | ✅ |
| Type check exit 0 | exit 0 | exit 0, no type errors | ✅ |
| Build exit 0 | exit 0 | exit 0, `/test` rendered as static `○` | ✅ |
| `src/components/test/useLiveFeed.ts` exists + exports `useLiveFeed` | file + export | confirmed | ✅ |
| `src/components/test/LiveFeed.tsx` exists + exports `LiveFeed` | file + export | confirmed | ✅ |
| `src/components/test/__tests__/useLiveFeed.test.ts` exists | file | confirmed (13 tests, all passing) | ✅ |
| `src/components/test/__tests__/LiveFeed.test.tsx` exists | file | confirmed (13 tests, all passing) | ✅ |
| GET `/test` contains `Live` | present | present ("Live Feed" heading + "Disconnected" SSR output) | ✅ |
| GET `/test` contains `Pause` | present | present (initial unpaused state) | ✅ |
| GET `/test` contains `Clear` | present | present (always rendered) | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

- HTTP checks were run via `pnpm start` (not `pnpm dev`) to avoid the `predev` migration step that requires ClickHouse running. `next start` serves the pre-built static output which is sufficient for verifying SSR content.
- The 10 `noNonNullAssertion` lint warnings in `useLiveFeed.test.ts` are style warnings (exit 0). Each `!` is guarded by a preceding `not.toBeNull()` assertion, making them correct. Acknowledged in the draft — left as-is per instructions.
- The 200-cap-on-resume-flush code path (`merged.slice(0, MAX_EVENTS)` in `togglePause`) is implemented correctly but not covered by a specific test case. Edge case only triggers when >200 events accumulate while paused. Risk is low given explicit unit test coverage for the non-flush cap path and the simple one-liner.
- `useLiveFeed.ts` uses a `pausedRef` to avoid stale closure issues in the EventSource handler, which is the correct pattern for React hooks with event listeners. Tests verify the stale-closure scenario works correctly.
- Spec behaviours confirmed: prepend ordering ✅, 200-event cap ✅, pause buffering ✅, resume flush ✅, clear-also-clears-buffer ✅, status transitions ✅, EventSource cleanup on unmount ✅.
