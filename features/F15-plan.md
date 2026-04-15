# F15 Plan

## Acceptance criteria

From SPEC §6.7 — Seed Data (`POST /api/seed`):

- Clears existing data and populates ClickHouse with realistic sample data (BR-102).
- Idempotent. Should complete in < 30 seconds.
- 6 event types: `Page Viewed`, `Button Clicked`, `Signup Completed`, `Purchase Completed`, `Subscription Renewed`, `Support Ticket Opened`.
- 70 users: 50 fully resolved, 10 multi-device, 10 anonymous-only.
- ~12,000 events over 30 days.
- Non-uniform distribution: power-law on user activity; `Page Viewed` ~40% of events.
- String properties: `page`, `button_name`, `plan`, `currency`, `source`.
- Numeric properties: `amount` (0–500), `duration_seconds` (0–3600), `ticket_count`.

From SPEC §6.7 — `GET /api/seed/status`:

- Returns current event count and user count — useful for verifying seed completed.

## Dependencies

Completed features this builds on:
- F1 (`features/F1-done.md`) — ClickHouse client singleton (`src/lib/clickhouse.ts`)
- F2 (`features/F2-done.md`) — Migration script / schema (`scripts/schema.sql`, `scripts/migrate.ts`)
- F4 (`features/F4-done.md`) — Identity resolution logic (`src/lib/identity.ts`)

Files that will be imported:
- `src/lib/clickhouse.ts` — the `clickhouse` singleton client
- `src/lib/identity.ts` — `resolveIdentityMapping` (or direct insert into `identity_mappings`)

## Files to create or modify

- CREATE `src/lib/seed.ts` — core seed data generation and insertion logic
- CREATE `src/app/api/seed/route.ts` — `POST /api/seed` handler
- CREATE `src/app/api/seed/status/route.ts` — `GET /api/seed/status` handler
- CREATE `src/lib/__tests__/seed.test.ts` — unit tests for seed logic

## Implementation order

1. **Create `src/lib/seed.ts`** — implement the seed data generator:
   - Define the 6 event types with their property schemas.
   - Implement a seeded PRNG (`mulberry32`) for reproducible distributions.
   - Implement power-law user activity distribution (~40% `Page Viewed`).
   - Generate 70 users: 50 fully resolved (1 device + 1 user_id), 10 multi-device (2–3 devices each + 1 user_id), 10 anonymous-only (device_id only, no user_id).
   - Generate ~12,000 events distributed over the last 30 days.
   - Assign appropriate string and numeric properties per event type.
   - Export a `seedData(client?)` function that:
     a. Truncates the `events` and `identity_mappings` tables.
     b. Bulk-inserts generated events via `INSERT ... FORMAT JSONEachRow`.
     c. Bulk-inserts identity mappings for the 60 resolved users.
   - Export helper functions for generating users and events (for testability).

2. **Create `src/app/api/seed/route.ts`** — `POST /api/seed`:
   - Calls `seedData()`.
   - Returns `201` with `{ ok: true, events: <count>, users: <count> }`.
   - Returns `500` with `{ error: "..." }` on failure.

3. **Create `src/app/api/seed/status/route.ts`** — `GET /api/seed/status`:
   - Queries ClickHouse for `SELECT count() FROM events` and distinct user count.
   - Returns `{ events: <number>, users: <number> }`.

4. **Create `src/lib/__tests__/seed.test.ts`** — unit tests for the generation logic (no ClickHouse dependency).

## Sprint contract

- [ ] File `src/lib/seed.ts` exists and exports `seedData`
- [ ] File `src/app/api/seed/route.ts` exists and exports `POST`
- [ ] File `src/app/api/seed/status/route.ts` exists and exports `GET`
- [ ] Test suite → `pnpm test` exits with 0 failures
- [ ] Lint check → `pnpm lint` exits 0
- [ ] Type check → `pnpm typecheck` exits 0
- [ ] Build check → `pnpm build` exits 0

## Test plan

- **Test file**: `src/lib/__tests__/seed.test.ts`
- **Module under test**: `src/lib/seed.ts` — user generation, event generation, property assignment, distribution logic
- **Cases to cover**:
  - Generates exactly 70 users: 50 fully-resolved, 10 multi-device, 10 anonymous-only
  - Multi-device users each have 2–3 device IDs
  - Anonymous-only users have a device_id but no user_id
  - Generates ~12,000 events (within ±500 tolerance — generation uses randomness)
  - All 6 event types are present in the generated events
  - `Page Viewed` events constitute approximately 40% of total (within ±5% tolerance)
  - Event timestamps span the last 30 days and are within that range
  - `Purchase Completed` events have numeric `amount` property in range 0–500
  - `Support Ticket Opened` events have numeric `ticket_count` property
  - String properties (`page`, `plan`, `currency`, `source`, `button_name`) are present on the relevant event types
  - `seedData` calls truncate on both tables, then inserts events and identity mappings (mock ClickHouse client)
  - Identity mappings are created for the 60 non-anonymous users (50 single-device + 10 multi-device with 2–3 devices each)
- **Integration gap**: `POST /api/seed` HTTP response, `GET /api/seed/status` HTTP response — requires dev server + ClickHouse

## Risks and open questions

- **Truncation safety**: `seedData` truncates both tables before inserting. The spec says "clears existing data" and "idempotent", so this is correct, but real-world use should be aware data is destroyed.
- **Power-law distribution**: The spec says "power-law on user activity" but doesn't specify the exponent. Will use a Zipf-like distribution where the most active user has ~10× the events of the median user. The test will verify `Page Viewed` is ~40% of total and that event counts per user are non-uniform.
- **Multi-device identity mappings**: For the 10 multi-device users, each device must be inserted into `identity_mappings` separately. Using direct bulk insert rather than `resolveIdentityMapping` (which does per-row SELECT) for performance.
- **Event count**: Spec says "~12,000" — will target 12,000 exactly but the test will allow ±500 tolerance since the distribution is randomized.
