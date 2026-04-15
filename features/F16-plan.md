# F16 Plan

## Acceptance criteria

From SPEC §6.7 and §7.1:

**POST /api/seed**
- Clears existing data and populates ClickHouse with realistic sample data (BR-102).
- Idempotent.
- Should complete in < 30 seconds.
- Returns `{ ok: true, events: <number>, users: <number> }` on success (status 201).
- Returns `{ error: "..." }` on failure (status 500).

**GET /api/seed/status**
- Returns current event count and user count — useful for verifying seed completed.
- Response: `{ events: <number>, users: <number> }`.
- Returns `{ error: "..." }` on failure (status 500).

## Dependencies

Completed features this builds on:
- **F1** (ClickHouse client singleton): `src/lib/clickhouse.ts`
- **F2** (migration script): `scripts/migrate.ts`, `scripts/schema.sql`
- **F15** (seed data generator): `src/lib/seed.ts` — provides `seedData()` function

Files that will be imported or extended:
- `src/lib/clickhouse.ts` — imported by `GET /api/seed/status`
- `src/lib/seed.ts` — imported by `POST /api/seed` (the `seedData` function)

## Files to create or modify

- MODIFY `src/app/api/seed/route.ts` — POST handler calling `seedData()` (already exists with implementation from F15; verify correctness against spec)
- MODIFY `src/app/api/seed/status/route.ts` — GET handler querying event/user counts (already exists with implementation from F15; verify correctness against spec)
- CREATE `src/app/api/seed/__tests__/route.test.ts` — unit tests for POST /api/seed
- CREATE `src/app/api/seed/status/__tests__/route.test.ts` — unit tests for GET /api/seed/status

## Implementation order

1. Review and verify `src/app/api/seed/route.ts` — ensure POST handler correctly calls `seedData()`, returns `{ ok: true, events, users }` with status 201, and returns `{ error }` with status 500 on failure.
2. Review and verify `src/app/api/seed/status/route.ts` — ensure GET handler queries ClickHouse for event count and resolved user count, returns `{ events, users }`.
3. Create `src/app/api/seed/__tests__/route.test.ts` — unit tests mocking `@/lib/seed` to test the route handler's HTTP behavior (status codes, response shapes, error handling).
4. Create `src/app/api/seed/status/__tests__/route.test.ts` — unit tests mocking `@/lib/clickhouse` to test the status route handler's HTTP behavior.

## Sprint contract

- [ ] Test suite → 0 failures (`pnpm test`)
- [ ] Linter → exit 0 (`pnpm lint`)
- [ ] Type check → exit 0 (`pnpm typecheck`)
- [ ] Build → exit 0 (`pnpm build`)
- [ ] File `src/app/api/seed/route.ts` exists and exports `POST`
- [ ] File `src/app/api/seed/status/route.ts` exists and exports `GET`
- [ ] File `src/app/api/seed/__tests__/route.test.ts` exists
- [ ] File `src/app/api/seed/status/__tests__/route.test.ts` exists
- [ ] HTTP check: POST `http://localhost:3000/api/seed` returns JSON with `ok`, `events`, and `users` fields (status 201)
- [ ] HTTP check: GET `http://localhost:3000/api/seed/status` returns JSON with `events` and `users` fields (both numbers)

## Test plan

- **Test file**: `src/app/api/seed/__tests__/route.test.ts`
- **Module under test**: `POST` handler from `src/app/api/seed/route.ts`
- **Cases to cover**:
  - Success: `seedData()` resolves → response is 201 with `{ ok: true, events: <n>, users: <n> }`
  - Failure: `seedData()` rejects with Error → response is 500 with `{ error: "<message>" }`
  - Failure: `seedData()` rejects with non-Error → response is 500 with `{ error: "Internal server error." }`

- **Test file**: `src/app/api/seed/status/__tests__/route.test.ts`
- **Module under test**: `GET` handler from `src/app/api/seed/status/route.ts`
- **Cases to cover**:
  - Success: ClickHouse returns counts → response is 200 with `{ events: <number>, users: <number> }`
  - Returns numeric values (not strings) even though ClickHouse returns string counts
  - Handles zero counts (empty database) → `{ events: 0, users: 0 }`
  - Failure: ClickHouse query throws → response is 500 with `{ error: "<message>" }`

- **Integration gap**: POST `/api/seed` and GET `/api/seed/status` HTTP responses — requires dev server

## Risks and open questions

None. The route implementations already exist from F15 and appear correct against the spec. The main work is adding the test files that were not created as part of F15.
