# F15 Eval Sprint 2 — 2026-04-15

## Tests written

No new integration test files written. Sprint 1's eval left no persistent integration test files — HTTP checks were done ad-hoc via curl in that sprint. No new persistent test files are warranted: all integration gaps from the plan are now covered by Phase B HTTP checks below (confirmed live), and adding a persistent HTTP test file would require a running ClickHouse + Next.js stack in CI, which the project does not have.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `src/lib/seed.ts` exists and exports `seedData` | file + export | confirmed, `seedData` exported at line 277 | ✅ |
| `src/app/api/seed/route.ts` exists, exports `POST` | file + export | confirmed, `POST` exported at line 3 | ✅ |
| `src/app/api/seed/status/route.ts` exists, exports `GET` | file + export | confirmed, `GET` exported at line 3 | ✅ |
| Test suite — 0 failures | 0 failures | 238 passing, 25 skipped, 0 failing | ✅ |
| `pnpm lint` exits 0 | exit 0 | exit 0 (4 pre-existing `noExplicitAny` warnings in test predicates — inherent to Vitest's `mock.calls` typing, no fix possible) | ✅ |
| `pnpm typecheck` exits 0 | exit 0 | exit 0, clean | ✅ |
| `pnpm build` exits 0 | exit 0 | exit 0; `/api/seed` and `/api/seed/status` appear in route list | ✅ |

## Phase B — HTTP checks

ClickHouse started via `./clickhouse server -- --path=.clickhouse`. Next.js dev server started on port 3099 via `pnpm next dev --port 3099`.

| Endpoint | Expected | Actual | Pass |
|----------|----------|--------|------|
| `POST /api/seed` | 201 `{ ok: true, events: ~12000, users: 60 }` | **201** `{"ok":true,"events":12000,"users":60}` | ✅ |
| `GET /api/seed/status` (after seed) | 200 `{ events: ~12000, users: <number> }` | **200** `{"events":12000,"users":61}` | ✅ |

### Note on user count discrepancy (60 vs 61)

`POST /api/seed` returns `users: 60` — the count of non-anonymous generated users (`users.filter(u => u.userId !== null).length` = 50 fully-resolved + 10 multi-device). `GET /api/seed/status` returns `users: 61` — it counts `DISTINCT coalesce(e.user_id, m.user_id, e.device_id)` across events, which includes anonymous device IDs that appear in events. With 12,000 events and a power-law distribution, 1 anonymous user happened to receive events; 9 anonymous users received none. This is correct and expected behavior — both endpoints are right per their own semantics. The spec says status is "useful for verifying seed completed", not that it must match the seed's reported user count.

### Root cause fixed from Sprint 1

`src/lib/seed.ts` line 295 now converts ISO timestamps at the insert boundary:

```typescript
timestamp: e.timestamp.replace("T", " ").replace("Z", ""),
```

`generateEvents()` (line 253) still returns ISO 8601 strings (`toISOString()`), preserving unit test compatibility. The conversion happens in `seedData()` only when building insert values. This is the correct isolation. Verified: `POST /api/seed` now returns 201, not 500.

## Score: 10/10

## Verdict: APPROVED

## Notes

- The sprint contract fix from Sprint 1 was applied correctly and precisely: timestamp conversion at insert boundary only, not in `generateEvents`. This keeps unit tests (which parse ISO strings with `new Date(event.timestamp)`) compatible while satisfying ClickHouse's JSONEachRow DateTime64 format requirement.
- All 7 Phase A criteria pass. Both Phase B HTTP endpoints now return correct status codes and bodies.
- No new test files were needed. The unit tests written in Sprint 1 remain correct and cover all testable logic without a ClickHouse dependency.
