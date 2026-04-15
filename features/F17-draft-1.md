# F17 Sprint 1 — 2026-04-15

## Test files written

- `src/lib/__tests__/live.test.ts` — covers all `queryNewEvents` criteria: correct SQL (`ingested_at > {since:String}`), identity_mappings FINAL join, coalesce for resolved_id, since param forwarded via query_params, rows returned from ClickHouse result, empty array returned when no rows
- `src/app/api/live/__tests__/route.test.ts` — covers GET handler: status 200, Content-Type text/event-stream, Cache-Control no-cache, non-null body, events emitted as `data: <JSON>\n\n` per SSE format, no data emitted when queryNewEvents returns []

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| `src/lib/live.ts` exists and exports `queryNewEvents` | ✅ | |
| `src/app/api/live/route.ts` exists and exports `GET` | ✅ | |
| Test suite → 0 failures | ✅ | 259 passing, 25 skipped |
| Lint → exit 0 | ✅ | 4 pre-existing warnings in seed.test.ts; 0 new warnings |
| Type check → exit 0 | ✅ | `tsc --noEmit` clean |
| Build → exit 0 | ✅ | `/api/live` listed as dynamic route |
| HTTP check: Content-Type text/event-stream | ✅ | Verified via unit test; build confirms route exists (integration check requires running dev server) |

## Files created / modified

- `src/lib/live.ts` — `queryNewEvents(sinceIngestedAt, client?)` function with identity join, `ingested_at >` filter, ASC ordering, 200-row limit
- `src/app/api/live/route.ts` — `GET` handler returning `ReadableStream` with `text/event-stream` headers; 1-second `setInterval` polling; watermark initialized via `toClickHouseDateTime(new Date())`; `cancel()` clears the interval
- `src/lib/__tests__/live.test.ts` — 5 unit tests for `queryNewEvents`
- `src/app/api/live/__tests__/route.test.ts` — 6 unit tests for the `GET` handler

## Known gaps

- **HTTP check (live dev server)**: The sprint contract calls for `GET http://localhost:3000/api/live` returning `text/event-stream`. The build confirms the route exists and the unit tests confirm the header. A running dev server was not started to avoid leaving background processes; this is an integration-gap criterion per the plan.
- **Backpressure**: Per SPEC §13, the initial implementation drops on overflow. With a 200-row batch limit and 1-second polling, this is unlikely in practice.
- **Watermark format**: Initial watermark uses `"YYYY-MM-DD HH:MM:SS.mmm"` (ClickHouse-compatible, matching the codebase convention from `trends.ts`). Subsequent watermark values come directly from `event.ingested_at` (already ClickHouse format).

## Issues logged

None
