# F2 Plan

## Acceptance criteria

From SPEC §4.1 — `events` table:
```sql
CREATE TABLE events (
    event_id     UUID           DEFAULT generateUUIDv4(),
    event_name   LowCardinality(String),
    timestamp    DateTime64(3, 'UTC'),
    device_id    Nullable(String),
    user_id      Nullable(String),
    properties   String,        -- JSON blob
    ingested_at  DateTime64(3, 'UTC') DEFAULT now64()
)
ENGINE = MergeTree()
ORDER BY (timestamp, event_id)
PARTITION BY toYYYYMM(timestamp);
```

From SPEC §4.2 — `identity_mappings` table:
```sql
CREATE TABLE identity_mappings (
    device_id   String,
    user_id     String,
    created_at  DateTime64(3, 'UTC') DEFAULT now64()
)
ENGINE = ReplacingMergeTree(created_at)
ORDER BY (device_id);
```

From SPEC §10 — Migration script:
- A `scripts/migrate.ts` script (run via `tsx`) creates the database and tables.
- `pnpm migrate` runs `tsx scripts/migrate.ts`.
- It shells out to `./clickhouse client --queries-file scripts/schema.sql`.
- The `predev` npm hook runs it automatically so first-time setup is still one command: `"predev": "tsx scripts/migrate.ts"`.
- `migrate.ts` uses `CREATE DATABASE IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` — fully idempotent.

## Dependencies

F2 builds on F1 (ClickHouse client singleton). F1 is implemented at `src/lib/clickhouse.ts` (commit d0a76ef). Note: no `features/F1-done` sentinel file exists, but the implementation is in place.

Exact file paths that will be imported or extended:
- `src/lib/clickhouse.ts` — the singleton client may be referenced conceptually, but migrate.ts uses the CLI binary directly (not the Node.js client) because it must create the database itself before the client (configured for `minipanel` db) can connect.

## Files to create or modify

- CREATE `scripts/schema.sql` — DDL: `CREATE DATABASE IF NOT EXISTS minipanel`, `CREATE TABLE IF NOT EXISTS` for `events` and `identity_mappings`
- CREATE `scripts/migrate.ts` — shells out to `./clickhouse client --queries-file scripts/schema.sql` with connection parameters from env vars
- MODIFY `package.json` — add `"migrate": "tsx scripts/migrate.ts"` and `"predev": "tsx scripts/migrate.ts"` scripts; add `tsx` to devDependencies

## Implementation order

1. **Create `scripts/schema.sql`** — Write the SQL file with `CREATE DATABASE IF NOT EXISTS minipanel;` followed by `CREATE TABLE IF NOT EXISTS minipanel.events (...)` and `CREATE TABLE IF NOT EXISTS minipanel.identity_mappings (...)`. Use fully-qualified table names (prefixed with `minipanel.`) since the CLI client won't have a default database set. Each statement separated by `;`.

2. **Create `scripts/migrate.ts`** — TypeScript script that:
   - Reads `CLICKHOUSE_URL` (default `http://localhost:8123`), parses host/port from it.
   - Reads `CLICKHOUSE_PASSWORD` (default `password`).
   - Resolves the path to `scripts/schema.sql` relative to the script location.
   - Spawns `./clickhouse client` with `--queries-file`, `--host`, `--port`, `--password` flags using `child_process.execSync` or `execFileSync`.
   - Logs success/failure to stdout.
   - Exits with code 0 on success, non-zero on failure.

3. **Modify `package.json`** — Add `tsx` as a devDependency. Add `"migrate": "tsx scripts/migrate.ts"` and `"predev": "tsx scripts/migrate.ts"` to scripts. Run `pnpm install` to update the lockfile.

4. **Write unit tests** for `scripts/migrate.ts` in `scripts/__tests__/migrate.test.ts` — verify the script constructs the correct CLI command with env vars and handles errors.

## Sprint contract

- [ ] File `scripts/schema.sql` exists and contains `CREATE DATABASE IF NOT EXISTS minipanel`
- [ ] File `scripts/schema.sql` contains `CREATE TABLE IF NOT EXISTS` for `events` table with columns: `event_id`, `event_name`, `timestamp`, `device_id`, `user_id`, `properties`, `ingested_at`
- [ ] File `scripts/schema.sql` contains `CREATE TABLE IF NOT EXISTS` for `identity_mappings` table with columns: `device_id`, `user_id`, `created_at`
- [ ] File `scripts/schema.sql` uses `MergeTree()` engine for events with `ORDER BY (timestamp, event_id)` and `PARTITION BY toYYYYMM(timestamp)`
- [ ] File `scripts/schema.sql` uses `ReplacingMergeTree(created_at)` engine for identity_mappings with `ORDER BY (device_id)`
- [ ] File `scripts/migrate.ts` exists and imports from `child_process`
- [ ] File `scripts/migrate.ts` reads `CLICKHOUSE_URL` and `CLICKHOUSE_PASSWORD` env vars with correct defaults
- [ ] `package.json` contains script `"migrate"` with value `"tsx scripts/migrate.ts"`
- [ ] `package.json` contains script `"predev"` with value `"tsx scripts/migrate.ts"`
- [ ] `package.json` lists `tsx` in `devDependencies`
- [ ] Test suite → 0 failures (`pnpm test`)
- [ ] Linter → exit 0 (`pnpm lint`)
- [ ] Type check → exit 0 (`pnpm typecheck`)
- [ ] Build → exit 0 (`pnpm build`)

## Test plan

- **Test file**: `scripts/__tests__/migrate.test.ts`
- **Module under test**: `scripts/migrate.ts` (the migration runner)
- **Cases to cover**:
  - Calls `./clickhouse client` with `--queries-file` pointing to `scripts/schema.sql`
  - Uses default host (`localhost`), port (`8123`), and password (`password`) when env vars are absent
  - Parses custom `CLICKHOUSE_URL` (e.g., `http://custom-host:9000`) into correct `--host` and `--port` flags
  - Uses custom `CLICKHOUSE_PASSWORD` from env var
  - Throws / exits non-zero when the child process fails (non-zero exit code)
  - Logs success message on completion

- **Integration gap**: Running `pnpm migrate` against a live ClickHouse server to verify tables are actually created — requires a running ClickHouse instance. Verifiable via `./clickhouse client --query "SHOW TABLES FROM minipanel"`.

## Risks and open questions

1. **`tsx` not currently installed**: The spec mandates `tsx` for running `.ts` scripts directly. It must be added as a devDependency. This is straightforward but changes the lockfile.

2. **CLI binary path**: The spec assumes `./clickhouse` exists in the project root. `migrate.ts` should fail with a clear error message if the binary is missing, rather than an opaque `ENOENT`.

3. **URL parsing for CLI flags**: The ClickHouse Node.js client accepts a URL (`http://localhost:8123`), but the CLI binary uses separate `--host` and `--port` flags. `migrate.ts` must parse the URL to extract these. The `--port` flag for `clickhouse client` refers to the **native TCP port** (default 9000), not the HTTP port (8123). However, the spec says to shell out with the CLI — the script should use `--host` and `--port` derived from the URL, keeping in mind that `clickhouse client` may need the TCP port (9000) rather than HTTP port. Since the spec defaults are used locally, and the local binary's `clickhouse client` connects via native protocol on port 9000 by default, the migration may work best by only passing `--host` and `--password` and letting the binary use its default port, unless a non-default URL is provided.
