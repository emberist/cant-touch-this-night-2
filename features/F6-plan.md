# F6 Plan

## Acceptance criteria

From SPEC §6.1 — `POST /api/events/batch`:

- Ingests an array of events.
- Same validation per event (as `POST /api/events`): `event_name` required; at least one of `device_id` or `user_id` required; `timestamp` optional (defaults to server time); `properties` optional.
- Identity resolution runs per event (same rules as single-event ingestion: insert mapping if both identifiers present, 409 on conflict).
- Returns `{ ok: number, errors: Array<{index, error}> }`.

## Dependencies

Completed features this builds on:
- **F1** (`src/lib/clickhouse.ts`) — ClickHouse client singleton
- **F2** (`scripts/migrate.ts`, `scripts/schema.sql`) — database and tables
- **F4** (`src/lib/identity.ts`) — `validateEvent`, `insertEvent`, `IdentityConflictError`
- **F5** (`src/app/api/events/route.ts`) — single-event POST route (pattern to follow)

All confirmed done via `features/F*-done.md` sentinel files.

## Files to create or modify

- CREATE `src/app/api/events/batch/route.ts` — POST handler for batch ingestion
- CREATE `src/app/api/events/batch/__tests__/route.test.ts` — unit tests for the batch route

## Implementation order

1. **Create `src/app/api/events/batch/route.ts`** — POST handler that:
   - Parses request body as JSON.
   - Validates the body is an array; returns 400 if not.
   - Iterates over the array, calling `insertEvent` for each item.
   - Collects per-event results: increments `ok` on success, pushes `{ index, error }` on validation or conflict errors.
   - Returns JSON `{ ok, errors }` with status 200 (or 400 if body is not an array).

2. **Create `src/app/api/events/batch/__tests__/route.test.ts`** — unit tests mocking `insertEvent` (same pattern as `src/app/api/events/__tests__/route.test.ts`).

## Sprint contract

- [ ] File `src/app/api/events/batch/route.ts` exists and exports `POST`
- [ ] Test suite → `pnpm test` exits 0 with 0 failures
- [ ] Lint → `pnpm lint` exits 0
- [ ] Type check → `pnpm typecheck` exits 0
- [ ] Build → `pnpm build` exits 0

## Test plan

- **Test file**: `src/app/api/events/batch/__tests__/route.test.ts`
- **Module under test**: `POST` from `src/app/api/events/batch/route.ts`
- **Cases to cover**:
  - All events valid → returns `{ ok: N, errors: [] }` with HTTP 200
  - Mixed valid/invalid events → returns correct `ok` count and `errors` array with correct `index` and `error` message for each failure
  - Identity conflict (409 from `insertEvent`) on one event → that event appears in `errors` with its conflict message; other events still succeed
  - Empty array → returns `{ ok: 0, errors: [] }`
  - Body is not an array (e.g. single object) → returns 400 with `{ error: "..." }`
  - Body is not valid JSON → returns 400 with `{ error: "..." }`
- **Integration gap**: HTTP check of `POST /api/events/batch` against running dev server — requires dev server

## Risks and open questions

1. **HTTP status code for partial success**: The spec says the route returns `{ ok, errors }` but does not specify the HTTP status code when some events fail and some succeed. Plan: return 200 always when the body is a valid array (errors are reported per-event in the `errors` array), and 400 only when the top-level body format is wrong (not an array, not JSON).
2. **Sequential vs parallel insertion**: The spec doesn't specify whether events in a batch should be processed sequentially or in parallel. Plan: process sequentially to preserve ordering and ensure identity resolution conflicts are deterministic within a single batch. This is consistent with the identity resolution algorithm in §5 where order matters for conflict detection.
