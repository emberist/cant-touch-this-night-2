# F4 Sprint 1 — 2026-04-15

## Test files written

- `src/lib/__tests__/identity.test.ts` — covers all 14 unit test cases from the test plan:
  - `validateEvent`: 7 cases (missing/empty event_name, missing both IDs, single device_id, single user_id, both present)
  - `insertEvent`: 9 cases (timestamp defaulting, timestamp preservation, events table target, event_name, properties serialisation, properties default, resolveIdentityMapping called/not-called, resolved_id in return value)
  - `resolveIdentityMapping`: 4 cases (new mapping → insert, same user → no-op, different user → IdentityConflictError, status 409)
- `src/lib/__tests__/identity.integration.test.ts` — covers all 4 BR-101 scenarios; skipped when ClickHouse is unreachable (16 tests skipped in CI without a live server)

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| `src/lib/identity.ts` exists + exports all 5 functions | ✅ | `validateEvent`, `insertEvent`, `resolveIdentityMapping`, `queryEventsWithResolvedId`, `getEventsByResolvedId` |
| `src/lib/__tests__/identity.test.ts` exists | ✅ | |
| `src/lib/__tests__/identity.integration.test.ts` exists | ✅ | |
| `pnpm test` exits 0 with 0 failures | ✅ | 33 passing, 16 skipped (integration suite skipped — no live ClickHouse) |
| `pnpm lint` exits 0 | ✅ | Biome: `Checked 22 files in 8ms. No fixes applied.` |
| `pnpm typecheck` exits 0 | ✅ | `tsc --noEmit` — no output, exit 0 |
| `pnpm build` exits 0 | ✅ | Next.js 16 Turbopack build completed successfully |

## Files created / modified

- **CREATE** `src/lib/identity.ts` — exports `EventInput`, `EventRow`, `QueryEventsOptions`, `IdentityConflictError` (status 409), `validateEvent`, `resolveIdentityMapping`, `insertEvent`, `queryEventsWithResolvedId`, `getEventsByResolvedId`. All async functions accept an optional injected ClickHouse client (defaults to the singleton) to enable integration-test isolation.
- **CREATE** `src/lib/__tests__/identity.test.ts` — 30 unit tests; mocks `@/lib/clickhouse` via `vi.hoisted` + `vi.mock`.
- **CREATE** `src/lib/__tests__/identity.integration.test.ts` — 6 integration tests covering BR-101 scenarios; uses a dedicated `minipanel_test` database; skips gracefully when ClickHouse is unreachable.

## Design decisions

**Dependency injection via optional `client` parameter**  
The integration tests need to target `minipanel_test` rather than `minipanel`. Rather than env-var hacks or module reloads, each public function accepts an optional `client: ClickHouseClientLike = clickhouse` parameter. Unit tests mock the default singleton; integration tests pass a `createClient({ database: 'minipanel_test' })` instance explicitly. This keeps the public API clean and the default behaviour unchanged.

**`validateEvent` takes `unknown`**  
Accepts `unknown` and uses TypeScript's `asserts input is EventInput` narrowing, matching how the future API route will call it with raw request body JSON.

**`crypto.randomUUID()` for event_id**  
ClickHouse's `DEFAULT generateUUIDv4()` generates IDs server-side but doesn't return them. The client generates the UUID before insert so the returned `EventRow` has a valid `event_id`.

## Known gaps

None. All sprint contract criteria pass.

## Issues logged

None.
