# F19 Plan

## Acceptance criteria

From SPEC.md §7.1 — Navigation Shell / Dashboard home (`/`):

- Dashboard home (`/`) shows headline metrics: total events, total users, most common event in the last 7 days.

## Dependencies

Completed features this builds on:
- **F1** (ClickHouse client singleton): `src/lib/clickhouse.ts`
- **F2** (Migration / schema): `scripts/migrate.ts`, `scripts/schema.sql` — `events` and `identity_mappings` tables exist
- **F18** (Navigation shell): `src/app/layout.tsx`, `src/components/Sidebar.tsx` — sidebar and layout are in place

Existing files that will be imported or extended:
- `src/lib/clickhouse.ts` — ClickHouse client used for queries
- `src/app/page.tsx` — current placeholder dashboard page (will be replaced)

Note: `GET /api/seed/status` (F16) already has queries for total events and total users count. The dashboard needs a similar but distinct API that also returns the most common event in the last 7 days.

## Files to create or modify

- CREATE `src/app/api/dashboard/route.ts` — API route returning `{ total_events, total_users, top_event_7d }`
- CREATE `src/app/api/dashboard/__tests__/route.test.ts` — unit tests for the dashboard API route
- MODIFY `src/app/page.tsx` — replace placeholder with server component that fetches and renders headline metrics

## Implementation order

1. **Create `src/app/api/dashboard/route.ts`** — `GET` handler that runs three ClickHouse queries in parallel:
   - `SELECT count() FROM events` → `total_events`
   - `SELECT count(DISTINCT resolved_id)` using the standard identity-resolution join → `total_users`
   - `SELECT event_name, count() as cnt FROM events WHERE timestamp >= now() - INTERVAL 7 DAY GROUP BY event_name ORDER BY cnt DESC LIMIT 1` → `top_event_7d` (name + count)
   
   Returns JSON: `{ total_events: number, total_users: number, top_event_7d: { name: string, count: number } | null }`

2. **Create `src/app/api/dashboard/__tests__/route.test.ts`** — unit tests mocking `@/lib/clickhouse`, following the same pattern as `src/app/api/seed/status/__tests__/route.test.ts`.

3. **Modify `src/app/page.tsx`** — convert to an async server component that:
   - Fetches headline metrics from ClickHouse directly (server component, no API fetch needed — import `clickhouse` from `@/lib/clickhouse` and run queries inline)
   - Renders three MUI `Card` components in a row (responsive grid):
     - **Total Events** — large number with label
     - **Total Users** — large number with label  
     - **Top Event (7 days)** — event name + count
   - Each card uses `data-testid` attributes: `metric-total-events`, `metric-total-users`, `metric-top-event`
   - Handles empty state (no events yet) gracefully — shows 0 / "No events yet"

## Sprint contract

- [ ] `pnpm test` → 0 failures
- [ ] `pnpm lint` → exit 0
- [ ] `pnpm typecheck` → exit 0
- [ ] `pnpm build` → exit 0
- [ ] File `src/app/api/dashboard/route.ts` exists and exports `GET`
- [ ] File `src/app/api/dashboard/__tests__/route.test.ts` exists
- [ ] HTTP check: GET `http://localhost:3000/api/dashboard` returns JSON with keys `total_events`, `total_users`, `top_event_7d`
- [ ] HTTP check: GET `http://localhost:3000/` contains `data-testid="metric-total-events"`
- [ ] HTTP check: GET `http://localhost:3000/` contains `data-testid="metric-total-users"`
- [ ] HTTP check: GET `http://localhost:3000/` contains `data-testid="metric-top-event"`

## Test plan

- **Test file**: `src/app/api/dashboard/__tests__/route.test.ts`
- **Module under test**: `GET` from `@/app/api/dashboard/route`
- **Cases to cover**:
  - Returns 200 with `total_events`, `total_users`, and `top_event_7d` fields when data exists
  - Returns numeric values (not strings) for `total_events` and `total_users`
  - `top_event_7d` contains `name` (string) and `count` (number) when events exist in the last 7 days
  - Returns `top_event_7d: null` when no events exist in the last 7 days (empty result set)
  - Returns 0 for events and users when database is empty
  - Returns 500 with error message when ClickHouse query throws

- **Integration gap**: HTTP checks for `GET /api/dashboard` and `GET /` rendered content — requires dev server

## Risks and open questions

None. The three queries are straightforward ClickHouse aggregations. The `top_event_7d` query uses server-side `now()` which is always UTC, consistent with how timestamps are stored.
