## F13 – getUserProfile null detection for missing users

`min(DateTime64)` in ClickHouse returns the epoch (`1970-01-01 00:00:00.000`) rather than
`NULL` when the aggregation runs over an empty result set (non-nullable column type).
Checking `statsRows[0].first_seen === null` would therefore never detect a missing user.
Decision: include `count() AS event_count` in the stats query and check
`Number(event_count) === 0` to detect "no events found". The unit test was updated to mock
`{ event_count: 0, first_seen: epoch, ... }` to match this behaviour.

## F33 — BR-101 Scenario 1 event count

**Criterion**: `identity.spec.ts` — "Click Anonymous Page View 4× → Identify User → user profile shows ≥5 events"

**Issue**: The Testing page's "Anonymous Page View" button generates a *new* random `device_id` on every click. After 4 clicks, `lastDeviceId` holds only the *last* device. "Identify User" links just that one device to `test@example.com`. Result: user profile shows 2 events (1 page view + 1 identify), not 5.

**Decision**: The AC #5/#6 test uses `POST /api/events` directly with a controlled `device_id` to send 4 anonymous events + 1 identity event for the same device. This correctly tests BR-101 (retroactive attribution). A separate UI smoke-test clicks the Testing page buttons to verify they work end-to-end, without asserting a specific event count.

## F2 – TCP vs HTTP port mismatch for `./clickhouse client --port`

`CLICKHOUSE_URL` (e.g. `http://localhost:8123`) uses the HTTP port, but `./clickhouse client`
connects via the native TCP protocol whose default port is **9000**, not 8123.

`scripts/migrate.ts` passes whatever port appears in `CLICKHOUSE_URL` to `--port`, so a default
`CLICKHOUSE_URL` of `http://localhost:8123` will tell the client to connect on TCP port 8123, which
will fail if ClickHouse is listening on the native TCP port 9000.

**Decision**: keep the current behaviour (pass the URL port as-is) so the env var controls the
port explicitly. Operators running a non-default setup must set `CLICKHOUSE_URL` to the native TCP
port (e.g. `http://localhost:9000`) when using `pnpm migrate`. The default local setup with the
bundled binary uses port 9000 for native TCP — adjust `CLICKHOUSE_URL` or set `--port` separately
if needed. This is an integration concern; unit tests are not affected.
