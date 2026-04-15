# F17 Plan

## Acceptance criteria

From SPEC §6.8 — Live Event Feed (SSE):

- `GET /api/live` returns a Server-Sent Events stream (`text/event-stream`).
- Polls ClickHouse every 1 second for events with `ingested_at > last_seen` and pushes them to the client.
- Used by the Testing page.
- Response is a stream of `text/event-stream` messages:
  ```
  data: {"event_id":"...","event_name":"Page Viewed","resolved_id":"device-abc","timestamp":"...","properties":{...}}
  
  data: {"event_id":"...","event_name":"Purchase Completed","resolved_id":"user@x.com","timestamp":"...","properties":{...}}
  ```
- Each event includes: `event_id`, `event_name`, `resolved_id`, `timestamp`, `properties`.

## Dependencies

Completed features this builds on:
- F1 (ClickHouse client singleton) — `src/lib/clickhouse.ts`
- F2 (migration / schema) — `events` and `identity_mappings` tables exist
- F4 (identity resolution) — `src/lib/identity.ts` for `EventRow` type and resolved-id query pattern

Exact file paths imported or extended:
- `src/lib/clickhouse.ts` — ClickHouse client singleton
- `src/lib/identity.ts` — `EventRow` type reused for the event shape

## Files to create or modify

- CREATE `src/lib/live.ts` — polling logic: queries ClickHouse for events newer than a given `ingested_at` watermark, returns resolved events
- CREATE `src/app/api/live/route.ts` — `GET` handler returning a `text/event-stream` `ReadableStream`
- CREATE `src/lib/__tests__/live.test.ts` — unit tests for the polling query builder
- CREATE `src/app/api/live/__tests__/route.test.ts` — unit tests for the SSE route handler

## Implementation order

1. **Create `src/lib/live.ts`** — Export a `queryNewEvents(sinceIngestedAt: string, client?)` function that:
   - Queries `events` joined with `identity_mappings FINAL` (same resolved-id pattern as `queryEventsWithResolvedId`).
   - Filters `e.ingested_at > {since:String}`.
   - Orders by `e.ingested_at ASC, e.event_id ASC` (oldest first so the client receives events in chronological order).
   - Returns `EventRow[]` (reusing the existing type from `identity.ts`).
   - Limits to a reasonable batch size (e.g. 200) to avoid unbounded results.

2. **Create `src/lib/__tests__/live.test.ts`** — Unit tests for `queryNewEvents` verifying SQL construction via a mocked ClickHouse client.

3. **Create `src/app/api/live/route.ts`** — `GET` handler that:
   - Returns a `Response` with `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
   - Uses a `ReadableStream` with a 1-second polling interval.
   - Tracks a `lastSeenIngestedAt` watermark (initialized to the current server time).
   - Each tick: calls `queryNewEvents(lastSeenIngestedAt)`, writes each event as `data: <JSON>\n\n`, and advances the watermark to the latest `ingested_at` in the batch.
   - On client disconnect (via `signal.aborted` / `controller.close()`), clears the interval and stops polling.

4. **Create `src/app/api/live/__tests__/route.test.ts`** — Unit tests for the route handler verifying SSE response headers and stream format.

## Sprint contract

- [ ] File `src/lib/live.ts` exists and exports `queryNewEvents`
- [ ] File `src/app/api/live/route.ts` exists and exports `GET`
- [ ] Test suite → 0 failures (`pnpm test`)
- [ ] Linter → exit 0 (`pnpm lint`)
- [ ] Type check → exit 0 (`pnpm typecheck`)
- [ ] Build → exit 0 (`pnpm build`)
- [ ] HTTP check: GET `http://localhost:3000/api/live` returns response with `Content-Type` header containing `text/event-stream`

## Test plan

### `src/lib/__tests__/live.test.ts`

- **Module under test**: `queryNewEvents` from `src/lib/live.ts`
- **Cases to cover**:
  - Calls ClickHouse with the correct SQL containing `ingested_at > {since:String}` and the join with `identity_mappings FINAL`
  - Passes the `since` parameter to `query_params`
  - Returns the parsed JSON rows from the ClickHouse result
  - Returns an empty array when no new events exist

### `src/app/api/live/__tests__/route.test.ts`

- **Module under test**: `GET` handler from `src/app/api/live/route.ts`
- **Cases to cover**:
  - Response status is 200
  - Response `Content-Type` header is `text/event-stream`
  - Response `Cache-Control` header is `no-cache`
  - Response body is a `ReadableStream` (non-null)
  - When `queryNewEvents` returns events, each event is written as `data: <JSON>\n\n` in the SSE format
  - When `queryNewEvents` returns an empty array, no `data:` lines are emitted for that tick

- **Integration gap**: Full end-to-end SSE streaming (connect, insert event via POST /api/events, verify it appears in the stream within ~2 seconds) — requires dev server

## Risks and open questions

1. **Watermark initialization**: The spec says "events with `ingested_at > last_seen`". On initial connection, `last_seen` is set to the current server time, meaning only events ingested after connection will appear. This matches the "live feed" use case. If historical events should appear on connect, the watermark would need to be set earlier (e.g. `now() - 5s`), but the spec does not require this.

2. **SSE backpressure**: SPEC §13 notes this as an open question. Per the spec guidance, the initial implementation will drop (send only newest) if events arrive faster than the client can consume. In practice with 1-second polling and a 200-event batch limit, this is unlikely to be an issue.

3. **Next.js 16 streaming**: The route uses the standard Web Streams API (`ReadableStream`) which Next.js App Router supports natively for streaming responses. No special Next.js-specific API is needed — this is a plain `Response` with a `ReadableStream` body.
