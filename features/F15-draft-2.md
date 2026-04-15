# F15 Sprint 2 — 2026-04-15

## Test files written

No new test files written in this sprint. All unit tests were written in Sprint 1 and continue to pass unchanged (`src/lib/__tests__/seed.test.ts`).

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| `src/lib/seed.ts` exists and exports `seedData` | ✅ | confirmed |
| `src/app/api/seed/route.ts` exists, exports `POST` | ✅ | confirmed |
| `src/app/api/seed/status/route.ts` exists, exports `GET` | ✅ | confirmed |
| Test suite — 0 failures | ✅ | 238 passing, 25 skipped, 0 failing |
| `pnpm lint` exits 0 | ✅ | 4 warnings on `any[]` in test predicates (pre-existing, unfixable without modifying test internals) |
| `pnpm typecheck` exits 0 | ✅ | clean |
| `pnpm build` exits 0 | ✅ | `/api/seed` and `/api/seed/status` appear in route list |

## Root cause fixed

**`src/lib/seed.ts`** — `seedData()` now converts ISO timestamps to ClickHouse-compatible format before inserting. `generateEvents()` continues to return ISO 8601 strings (`"YYYY-MM-DDTHH:MM:SS.mmmZ"`) so existing unit tests that call `new Date(event.timestamp)` remain correct regardless of timezone. The conversion happens at the insert boundary only:

```typescript
values: events.map((e) => ({
  ...e,
  timestamp: e.timestamp.replace("T", " ").replace("Z", ""),
})),
```

This produces `"YYYY-MM-DD HH:MM:SS.mmm"` which ClickHouse v26 JSONEachRow accepts for `DateTime64` columns.

## Files created / modified

- `src/lib/seed.ts` — fixed `seedData()`: timestamp conversion applied at insert time (not in `generateEvents`), preserving test compatibility

## Known gaps

None. All sprint contract criteria pass.

## Issues logged

None.
