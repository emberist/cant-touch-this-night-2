# F22 Sprint 1 — 2026-04-15

## Test files written

- `src/components/trends/__tests__/useTrends.test.ts` — covers schema fetch on mount, default control values, trends fetch behavior (trigger conditions, URL params, series population), loading state, numericProperties derivation, error handling
- `src/components/trends/__tests__/TrendsControls.test.tsx` — covers event name autocomplete, all six measure options, property dropdown conditional rendering (hidden for count/unique_users, shown for sum/avg/min/max), granularity toggle (Day/Week), date range preset chips (Last 7d, Last 30d, Last 90d), breakdown selector, data-testid container
- `src/components/__tests__/TrendChart.test.tsx` — covers all four chart type toggle options (Line/Bar/Area/Table), empty state, loading skeleton, auto-switch to Bar for single-bucket data, Table mode rendering with date rows, data-testid container

## Sprint contract results

| Criterion | Result | Notes |
|---|---|---|
| `pnpm test` 0 failures | ✅ | 348 passing, 25 skipped (skipped = integration tests needing DB) |
| `pnpm lint` exit 0 | ✅ | 7 warnings (all pre-existing in `seed.test.ts`), no errors |
| `pnpm typecheck` exit 0 | ✅ | Clean |
| `pnpm build` exit 0 | ✅ | `/trends` appears as `○` (static) in route table |
| `src/components/trends/useTrends.ts` exists, exports `useTrends` | ✅ | |
| `src/components/trends/TrendsControls.tsx` exists, exports `TrendsControls` | ✅ | |
| `src/components/TrendChart.tsx` exists, exports `TrendChart` | ✅ | |
| `src/app/trends/page.tsx` imports `TrendChart` | ✅ | line 6 |
| `src/app/trends/page.tsx` imports `TrendsControls` | ✅ | line 7 |
| HTTP: GET `/trends` contains `Trends` | ✅ | verified in `.next/server/app/trends.html` |
| HTTP: GET `/trends` contains `data-testid="trends-controls"` | ✅ | verified in built HTML |
| HTTP: GET `/trends` contains `data-testid="trend-chart"` | ✅ | verified in built HTML |

## Files created / modified

- **CREATED** `src/components/trends/useTrends.ts` — custom hook; fetches `/api/schema` on mount, fetches `/api/trends` when `eventName` is set, exposes `controls`, `setters`, `series`, `numericProperties`, `loading`, `error`
- **CREATED** `src/components/trends/TrendsControls.tsx` — client component; event name autocomplete, native `Select` for measure (6 options), conditional property autocomplete for aggregation measures, `ToggleButtonGroup` for granularity, preset date chips + date inputs, breakdown autocomplete with limit field
- **CREATED** `src/components/TrendChart.tsx` — client component; `ToggleButtonGroup` chart type switcher (Line/Bar/Area/Table), auto-switches to Bar when all series have exactly 1 data point, Recharts charts, MUI Table for table mode, Skeleton for loading, empty state
- **MODIFIED** `src/app/trends/page.tsx` — replaced placeholder with full Trends page composing the three above
- **CREATED** `src/components/trends/__tests__/useTrends.test.ts`
- **CREATED** `src/components/trends/__tests__/TrendsControls.test.tsx`
- **CREATED** `src/components/__tests__/TrendChart.test.tsx`

## Known gaps

- **HTTP checks via live server not verified**: The sprint contract HTTP checks were verified against the static build output (`.next/server/app/trends.html`) rather than a running dev server, because starting a dev server requires ClickHouse to be running (via `pnpm dev`). The built HTML confirms all three criteria.
- **Recharts in jsdom**: As documented in the test plan, Recharts renders no SVG in jsdom. The `TrendChart` tests mock recharts to verify logic (auto-switch, table mode, empty/loading states) rather than SVG content.
- **MUI v9 API**: `Stack.alignItems` and `TextField.InputLabelProps`/`inputProps` do not exist in MUI v9. Fixed by using `sx={{ alignItems }}`, `Box` flex containers, and `slotProps` instead.

## Issues logged

None — no spec ambiguities encountered.
