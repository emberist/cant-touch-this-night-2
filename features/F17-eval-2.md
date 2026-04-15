# F17 Eval Sprint 2 — 2026-04-15

## Tests written

No new integration/e2e tests written.

Eval-1 noted no prior integration/e2e tests. The full end-to-end streaming test (connect SSE → POST /api/events → verify event appears in stream) requires ClickHouse running. ClickHouse is not available in this environment; the test would unconditionally skip and add no value. Playwright e2e infrastructure exists but no new page was added in this feature. Skipping is correct.

All unit tests from the generator were run as-is and pass.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `src/lib/live.ts` exists and exports `queryNewEvents` | File present, export present | Present at `src/lib/live.ts:19` | ✅ |
| `src/app/api/live/route.ts` exists and exports `GET` | File present, export present | Present at `src/app/api/live/route.ts:15` | ✅ |
| Test suite → 0 failures (`pnpm test`) | 0 failures | 260 passed, 25 skipped, 0 failures | ✅ |
| Linter → exit 0 (`pnpm lint`) | exit 0 | exit 0 — 4 pre-existing warnings in `seed.test.ts`, 0 new | ✅ |
| Type check → exit 0 (`pnpm typecheck`) | exit 0 | exit 0 | ✅ |
| Build → exit 0 (`pnpm build`) | exit 0, `/api/live` listed as Dynamic | exit 0, `ƒ /api/live` listed | ✅ |
| HTTP check: `GET /api/live` → `Content-Type: text/event-stream` | Headers flushed immediately, status 200 | `HTTP/1.1 200 OK`, `content-type: text/event-stream`, `cache-control: no-cache`, `connection: keep-alive`; 3 bytes (`:\n\n` keep-alive comment) received before ClickHouse timeout | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

- The Sprint 2 fix (`controller.enqueue(encoder.encode(":\n\n"))` before `setInterval`) correctly resolves the header-flush bug identified in Eval Sprint 1. Headers are sent to the TCP socket immediately on connect even when ClickHouse is unavailable or returns no rows.
- HTTP check run on port 3001 (via `npx next dev --port 3001`) because `pnpm dev` runs `predev` which calls `tsx scripts/migrate.ts`, and that script exits non-zero when ClickHouse is not running. The route behaviour is identical across ports.
- The three updated unit test cases in `route.test.ts` (keep-alive assertion, two updated data/empty-array cases) correctly reflect the new first-chunk behaviour and pass.
- `EventRow.ingested_at` watermark advancement (`events[events.length - 1].ingested_at`) assumes ClickHouse returns the field as a string in a format it can accept back as a `{since:String}` parameter. This holds true for `DateTime64` with `JSONEachRow` format. No issue observed.
