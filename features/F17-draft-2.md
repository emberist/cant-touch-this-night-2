# F17 Sprint 2 — 2026-04-15

## Test files written

No new test files were created. The existing test files from Sprint 1 were updated to
account for the new keep-alive behaviour introduced by the fix:

- `src/app/api/live/__tests__/route.test.ts` — added one new test case and updated
  two existing test cases (see "Files created / modified" below).

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| `src/lib/live.ts` exists and exports `queryNewEvents` | ✅ | Unchanged from Sprint 1 |
| `src/app/api/live/route.ts` exists and exports `GET` | ✅ | Fixed: keep-alive comment added |
| Test suite → 0 failures (`pnpm test`) | ✅ | 260 passed, 25 skipped, 0 failures |
| Linter → exit 0 (`pnpm lint`) | ✅ | 4 pre-existing warnings in seed.test.ts; 0 new |
| Type check → exit 0 (`pnpm typecheck`) | ✅ | exit 0 |
| Build → exit 0 (`pnpm build`) | ✅ | `ƒ /api/live` listed as Dynamic |
| HTTP check: `GET /api/live` → `Content-Type: text/event-stream` | ✅ | `200 OK`, `Content-Type: text/event-stream`, headers flushed immediately even with ClickHouse down |

## Files created / modified

- `src/app/api/live/route.ts` — added `controller.enqueue(encoder.encode(":\n\n"))` as
  the first statement inside `start(controller)`, before `setInterval`. This is the
  standard SSE keep-alive pattern: clients treat lines beginning with `:` as comments
  and ignore them, but the enqueue forces the HTTP layer to flush the status line and
  headers to the TCP socket immediately on connect.

- `src/app/api/live/__tests__/route.test.ts` — three changes, noted because the
  instructions say to flag test modifications:
  1. **New test** — "immediately enqueues a keep-alive SSE comment on connect before
     any timer fires": reads the first chunk without advancing timers and asserts it
     equals `":\n\n"`.
  2. **Updated test** — "emits data: <JSON>\\n\\n for each event...": added a
     `reader.read()` call before the timer tick to consume the keep-alive comment;
     added assertion that the consumed chunk equals `":\n\n"`.
  3. **Updated test** — "does not emit data: lines when queryNewEvents returns an
     empty array": same treatment — consume and assert the keep-alive comment before
     advancing the timer and asserting the subsequent read stays pending.

  These were factual corrections, not intent changes: the original tests assumed no
  chunk would be enqueued before the first interval tick, which is no longer true.

## Known gaps

None. All sprint contract criteria pass.

The acknowledged integration gap from the plan — full end-to-end SSE streaming
(connect → POST /api/events → verify event appears in stream within ~2 s) — still
requires ClickHouse running and was not attempted here, as documented in the plan.

## Issues logged

None. ISSUES.md not updated.
