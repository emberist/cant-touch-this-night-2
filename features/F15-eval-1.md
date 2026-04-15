# F15 Eval Sprint 1 — 2026-04-15

## Tests written

- No new integration test files written. The plan explicitly flagged `POST /api/seed` and `GET /api/seed/status` HTTP responses as an "integration gap". These were verified directly via `curl` against a live ClickHouse + Next.js stack during Phase B, rather than as persistent test files — the live server revealed a real bug (see below).

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|---|---|---|---|
| `src/lib/seed.ts` exists and exports `seedData` | file + export | confirmed | ✅ |
| `src/app/api/seed/route.ts` exists, exports `POST` | file + export | confirmed | ✅ |
| `src/app/api/seed/status/route.ts` exists, exports `GET` | file + export | confirmed | ✅ |
| Test suite — 0 failures | 0 failures | 238 passing, 25 skipped, 0 failing | ✅ |
| `pnpm lint` exits 0 | exit 0 | exit 0 (4 warnings on `any[]` in test predicates) | ✅ |
| `pnpm typecheck` exits 0 | exit 0 | exit 0 | ✅ |
| `pnpm build` exits 0 | exit 0 | exit 0; `/api/seed` and `/api/seed/status` appear in route list | ✅ |

## Phase B — HTTP checks

| Endpoint | Expected | Actual |
|---|---|---|
| `POST /api/seed` | 201 `{ ok: true, events: ~12000, users: 60 }` | **500** `{ "error": "Cannot parse input: expected '\"' before: 'Z'..." }` |
| `GET /api/seed/status` | 200 `{ events: number, users: number }` | **200** `{ "events": 1, "users": 1 }` ✅ |

### Root cause — `POST /api/seed` returns 500

`src/lib/seed.ts:253` generates event timestamps via:

```typescript
const timestamp = new Date(tsMs).toISOString();
```

This produces the ISO 8601 format `"2026-04-15T12:00:00.000Z"` (with `T` separator and `Z` suffix). ClickHouse v26.4.1's JSONEachRow parser rejects this format for `DateTime64` columns — it expects `"YYYY-MM-DD HH:MM:SS.mmm"` (space-separated, no `T`, no `Z`).

Verified with direct HTTP insert to ClickHouse:
- `"timestamp":"2026-04-15T12:00:00.000Z"` → `Code: 27. Cannot parse input: expected '"' before: 'Z'`
- `"timestamp":"2026-04-15 12:00:00.000"` → insert succeeds

This same bug exists in `src/lib/identity.ts:135,138` (confirmed: `POST /api/events` also returns 400 with the same error). It is a systemic issue — not introduced by F15 — but F15's `seed.ts` inherits it and the failing `POST /api/seed` is the first integration test to expose it in this feature.

The fix for `seed.ts:253`:
```typescript
// Before:
const timestamp = new Date(tsMs).toISOString();
// After:
const timestamp = new Date(tsMs).toISOString().replace('T', ' ').replace('Z', '');
```

## Score: 6/10

## Verdict: NEEDS_WORK

## Feedback for next sprint

| Criterion | Error | File:Line | Action |
|---|---|---|---|
| `POST /api/seed` must return 201 | `500 {"error":"Cannot parse input: expected '\"' before: 'Z'..."}` — ClickHouse JSONEachRow rejects ISO 8601 `T`/`Z` format for DateTime64 | `src/lib/seed.ts:253` | Change `new Date(tsMs).toISOString()` to `new Date(tsMs).toISOString().replace('T', ' ').replace('Z', '')` |

## Notes

- All 7 sprint contract criteria (file checks, tests, lint, typecheck, build) pass — the generator's self-evaluation was accurate for those.
- The timestamp bug is pre-existing in `identity.ts` (F4/F5) and was previously flagged as a NEEDS_WORK in F11 sprint 1. F11 sprint 2 fixed it in the trends query parameters but the fix was not propagated to the insert path. `seed.ts` inherits the unfixed insert path from `identity.ts`.
- `GET /api/seed/status` works correctly — it queries ClickHouse (no insert) so the timestamp format does not affect it.
- Unit tests mock the ClickHouse client entirely, so they cannot catch insert format bugs. This is by design (no ClickHouse required for unit tests), but it means the integration gap is real and important.
- The 4 `noExplicitAny` lint warnings in `seed.test.ts` are inherent to Vitest's `mock.calls` typing (`any[][]`); no fix needed.
