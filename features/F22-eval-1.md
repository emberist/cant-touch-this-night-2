# F22 Eval Sprint 1 — 2026-04-15

## Tests written

- `playwright_tests/trends.spec.ts` — HTTP integration tests for the live `/trends` page: page title, `data-testid="trends-controls"` visibility, `data-testid="trend-chart"` visibility, page heading. Covers the three integration gaps listed in the sprint contract.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `pnpm test` → 0 failures | 0 failures | 348 passed, 25 skipped (pre-existing DB skips), 0 failures | YES |
| `pnpm lint` → exit 0 | exit 0 | exit 0 (7 warnings: 4 pre-existing in seed.test.ts, 3 new in F22 files — see Notes) | YES |
| `pnpm typecheck` → exit 0 | exit 0 | exit 0, clean | YES |
| `pnpm build` → exit 0 | exit 0 | exit 0; `/trends` appears as `○` (static) in route table | YES |
| `src/components/trends/useTrends.ts` exists + exports `useTrends` | file + named export | `export function useTrends()` at line 53 | YES |
| `src/components/trends/TrendsControls.tsx` exists + exports `TrendsControls` | file + named export | `export function TrendsControls(...)` at line 65 | YES |
| `src/components/TrendChart.tsx` exists + exports `TrendChart` | file + named export | `export function TrendChart(...)` at line 120 | YES |
| `src/app/trends/page.tsx` imports `TrendChart` | import present | `import { TrendChart } from "@/components/TrendChart"` at line 6 | YES |
| `src/app/trends/page.tsx` imports `TrendsControls` | import present | `import { TrendsControls } from "@/components/trends/TrendsControls"` at line 7 | YES |
| HTTP GET `/trends` → contains `Trends` | text present | Verified via live dev server (port 3099) and built HTML | YES |
| HTTP GET `/trends` → contains `data-testid="trends-controls"` | attribute present | Verified via live dev server and built HTML | YES |
| HTTP GET `/trends` → contains `data-testid="trend-chart"` | attribute present | Verified via live dev server and built HTML | YES |

## Score: 10/10

## Verdict: APPROVED

## Notes

### Lint warnings in new F22 files (not blocking — exit 0 — but flagged for quality)

Three lint warnings were introduced by the generator in F22 files. These are `lint/...` warnings (not errors) so they do not fail the sprint contract, but they indicate code quality issues:

1. `src/components/TrendChart.tsx:55` — `lint/complexity/noUselessFragments`: `return <></>` should be `return null`. Low severity.
2. `src/components/__tests__/TrendChart.test.tsx:3` — `lint/correctness/noUnusedImports`: `beforeEach` imported but never used in that file.
3. `src/components/__tests__/TrendChart.test.tsx:44` — `lint/correctness/noUnusedVariables`: `makeMultiSeries` defined but never called. Likely written in anticipation of multi-series tests that were not implemented.
4. `src/components/trends/__tests__/TrendsControls.test.tsx:3` — `lint/correctness/noUnusedImports`: `beforeEach` imported but never used.

All four pre-existing warnings in `src/lib/__tests__/seed.test.ts` are unchanged from before this sprint.

### HTTP check method

The generator verified HTTP criteria against the static build output (`.next/server/app/trends.html`) rather than a live server. This eval independently confirmed with a live dev server on port 3099 — all three criteria pass.

### ClickHouse connectivity during build

ClickHouse was not running during `pnpm build`. The ECONNREFUSED errors in build output come from static page generation for pages that attempt to prefetch dashboard/schema data — not from the `/trends` page itself. `/trends` builds cleanly as a static page (`○`) with no ClickHouse dependency at build time.

### Integration gaps — Playwright test written

`playwright_tests/trends.spec.ts` was written to cover the three integration gaps identified in the plan. The existing `playwright.config.ts` points to `./playwright_tests/` with `testDir`, so the new test will be picked up automatically. The `webServer` block in `playwright.config.ts` is commented out — a running server must be provided via `BASE_URL` env var or the default `http://localhost:3000` must be live before running Playwright tests.

### Auto-switch logic — useEffect vs initial state

`TrendChart.tsx` initialises `chartType` with a ternary based on `isSingleBucket`, then also has a `useEffect` that re-evaluates on `series` change. The `useEffect` always resets to `"line"` or `"bar"` whenever series changes, which means a user who manually selects "Area" or "Table" will have their selection overridden if new data loads. This is a minor UX bug but is not a sprint-contract violation.
