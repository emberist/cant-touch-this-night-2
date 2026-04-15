# F7 Plan

## Acceptance criteria

From SPEC.md §6.2 — Event Explorer:

**`GET /api/events/list`**

Query params:
- `event_name` (optional) — filter by name
- `resolved_id` (optional) — filter by resolved identity
- `before` (optional) — ISO timestamp cursor for pagination
- `limit` (optional, default 50, max 200)

Returns events in reverse chronological order, with `resolved_id` computed. Cursor-based pagination avoids offset slowness on large tables.

Response:
```json
{
  "events": [...],
  "next_cursor": "2026-04-14T11:59:59.000Z"
}
```

## Dependencies

Completed features this builds on:
- F1 — ClickHouse client singleton (`src/lib/clickhouse.ts`)
- F2 — Migration script (`scripts/migrate.ts`, `scripts/schema.sql`) — creates `events` and `identity_mappings` tables
- F4 — Identity resolution logic (`src/lib/identity.ts`) — provides `queryEventsWithResolvedId`, `EventRow`, `QueryEventsOptions`
- F5 — `POST /api/events` route (`src/app/api/events/route.ts`) — needed to populate events for testing

Exact file paths imported or extended:
- `src/lib/identity.ts` — imports `queryEventsWithResolvedId`, `EventRow`
- `src/lib/clickhouse.ts` — transitively via identity.ts

## Files to create or modify

- CREATE `src/app/api/events/list/route.ts` — GET handler for `/api/events/list`
- CREATE `src/app/api/events/list/__tests__/route.test.ts` — unit tests (mocked)

## Implementation order

1. **Create `src/app/api/events/list/route.ts`** — implement the `GET` handler:
   - Parse query params: `event_name`, `resolved_id`, `before`, `limit`
   - Validate `limit` (default 50, clamp to max 200, reject non-numeric)
   - Call `queryEventsWithResolvedId(options)` from `src/lib/identity.ts`
   - Compute `next_cursor` from the last event's timestamp (or `null` if fewer events than `limit` were returned)
   - Return `{ events, next_cursor }`

2. **Create `src/app/api/events/list/__tests__/route.test.ts`** — unit tests mocking `queryEventsWithResolvedId`:
   - Verify 200 response with `events` array and `next_cursor`
   - Verify filtering by `event_name`, `resolved_id`, `before`
   - Verify default and custom `limit`
   - Verify `next_cursor` is `null` when fewer events than limit
   - Verify invalid limit handling

## Sprint contract

- [ ] File `src/app/api/events/list/route.ts` exists and exports `GET`
- [ ] Test suite → `pnpm test` → 0 failures
- [ ] Lint → `pnpm lint` → exit 0
- [ ] Type check → `pnpm typecheck` → exit 0
- [ ] Build → `pnpm build` → exit 0
- [ ] **Integration gap**: HTTP check: `GET http://localhost:3000/api/events/list` returns JSON with `events` array and `next_cursor` field

## Test plan

- **Test file**: `src/app/api/events/list/__tests__/route.test.ts`
- **Module under test**: `GET` handler from `src/app/api/events/list/route.ts`
- **Cases to cover**:
  - Returns 200 with `{ events: [...], next_cursor }` when events exist
  - Passes `event_name` query param to `queryEventsWithResolvedId`
  - Passes `resolved_id` query param to `queryEventsWithResolvedId`
  - Passes `before` cursor query param to `queryEventsWithResolvedId`
  - Uses default limit of 50 when not specified
  - Respects custom `limit` param (clamped to max 200)
  - Returns `next_cursor` as the timestamp of the last returned event when result count equals limit
  - Returns `next_cursor` as `null` when fewer events than limit are returned (no more pages)
  - Returns 200 with empty `events` array and `null` cursor when no events match

Mock strategy: mock `@/lib/identity` module's `queryEventsWithResolvedId` function (same pattern as existing route tests). The underlying query logic and ClickHouse interaction are already tested in `src/lib/__tests__/identity.test.ts` and `identity.integration.test.ts`.

## Risks and open questions

None. The core query logic (`queryEventsWithResolvedId`) already exists in `src/lib/identity.ts` with full filter and cursor support. This feature is a thin HTTP layer on top.
