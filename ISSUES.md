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
