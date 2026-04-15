# F17 Eval Sprint 1 — 2026-04-15

## Tests written

No new integration/e2e tests written. The HTTP check (Phase B) directly exposed the bug; adding a unit test for HTTP-level header-flush behaviour would not catch it in Vitest (unit tests call `GET()` in-process and inspect the `Response` object, bypassing the HTTP framing layer). The full end-to-end streaming test (SSE connect → POST /api/events → verify event in stream within 2s) requires ClickHouse running and is an acknowledged integration gap in the plan. Playwright infrastructure exists but the example spec targets an external site; no feature spec was written here.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| `src/lib/live.ts` exists and exports `queryNewEvents` | File present, export present | ✅ Present | ✅ |
| `src/app/api/live/route.ts` exists and exports `GET` | File present, export present | ✅ Present | ✅ |
| Test suite → 0 failures (`pnpm test`) | 0 failures | 259 passed, 25 skipped, 0 failures | ✅ |
| Linter → exit 0 (`pnpm lint`) | exit 0 | exit 0 (4 pre-existing warnings in seed.test.ts; 0 new) | ✅ |
| Type check → exit 0 (`pnpm typecheck`) | exit 0 | exit 0 | ✅ |
| Build → exit 0 (`pnpm build`) | exit 0, `/api/live` listed as dynamic | exit 0, `ƒ /api/live` listed | ✅ |
| HTTP check: `GET /api/live` → `Content-Type: text/event-stream` | Response headers include `text/event-stream` | 0 bytes received; headers never flushed to client | ❌ |

## Score: 7/10

## Verdict: NEEDS_WORK

## Feedback for next sprint

| Criterion | Error | File:Line | Action |
|-----------|-------|-----------|--------|
| HTTP check: `GET /api/live` returns `Content-Type: text/event-stream` | `curl: (28) Operation timed out after 3009 milliseconds with 0 bytes received` — response headers are never sent to the TCP socket until the first chunk is enqueued into the `ReadableStream`. Without ClickHouse running (or when no new events exist), the stream never enqueues data, so the HTTP response is never written. Confirmed in both Turbopack dev and `next start` (production). | `src/app/api/live/route.ts:26` (the `start` callback) | Immediately enqueue a SSE keep-alive comment before setting up the interval so headers are flushed on connect: `controller.enqueue(encoder.encode(":\n\n"));` — add this as the first statement inside `start(controller)`, before the `setInterval` call. SSE clients (browsers, curl) treat lines beginning with `:` as comments and ignore them; this is the standard way to flush headers immediately on connection. |

## Notes

- **Root cause detail**: `new Response(stream, { headers })` in Next.js App Router does not flush the HTTP status line + headers until the first byte of the body is written. The unit tests pass because they call `GET()` in-process and assert on the `Response` object directly — headers are correctly attached to the object, but the object is never serialised over a socket. The HTTP check reveals the gap.
- **Affected scenario beyond no-ClickHouse**: even with ClickHouse available and the database empty, the first polling tick (1 second) returns zero rows, enqueues nothing, and the client hangs. Only if there is at least one event with `ingested_at > now()` at the moment of connect would the headers be flushed within the first second.
- **Fix is one line**: add `controller.enqueue(encoder.encode(":\n\n"));` at the top of `start(controller)`. All existing unit tests continue to pass unchanged.
- **Lint**: 4 pre-existing `noExplicitAny` warnings in `src/lib/__tests__/seed.test.ts` — none introduced by F17.
- **Integration gap (known)**: full end-to-end streaming test (connect SSE → POST event → assert event appears in stream) requires both ClickHouse and the dev server; not attempted here.
