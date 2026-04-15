# F29 Plan

## Acceptance criteria

From SPEC §7.7 (Bulk Generator Page — Generation Strategy & API Routes):

- Client posts config to `POST /api/generate/start` → receives a `job_id`.
- Client subscribes to `GET /api/generate/[job_id]/status` (SSE) to receive progress.
- Server inserts events in batches of **10,000 rows** using ClickHouse's native protocol bulk insert (`INSERT INTO events FORMAT JSONEachRow`). ClickHouse can sustain ~100k–500k rows/sec on local hardware.
- Identity mappings are inserted in a separate batch after event insertion.
- Job completes when all batches are done. Total time for 1M events: typically 5–15 seconds on modern hardware.
- Generation runs in a Node.js `async` loop (no worker threads needed; ClickHouse inserts are async I/O).
- Job state is stored in an in-memory `Map<job_id, JobState>` (sufficient for single-machine use; no Redis needed).
- Each batch generates random events using a seeded pseudo-random number generator (`mulberry32`) so distributions are reproducible given the same seed.
- The generator reuses the same identity resolution logic as the seed script (`src/lib/seed.ts`), ensuring correctness.

From SPEC §7.7 — `POST /api/generate/start` request body (configuration form fields):

- `total` (total events): number, default 10,000, min 1, max 1,000,000
- `users` (number of users): number, default 100
- `start` / `end` (date range): ISO date strings, default last 30 days
- `event_types` (event mix with weights): selected event types and relative frequencies
- `identity_resolution` (toggle): boolean, default true
- `anonymous_ratio` (slider 0–100%): number, default 30
- `numeric_variance` (slider): string enum, default "medium"

Response: `{ job_id: string }`

From SPEC §7.7 — `POST /api/generate/[job_id]/cancel`:

- Sets a cancellation flag checked between batches. Returns `{ cancelled: true }`.

From SPEC §7.7 — `GET /api/generate/jobs`:

- Lists recent generation jobs with status and row counts.

From SPEC §7.7 — `GET /api/generate/[job_id]/status` (SSE):

- Streams progress events:
  ```
  data: {"status":"running","inserted":50000,"total":1000000,"throughput":125000,"eta_seconds":7}
  data: {"status":"complete","inserted":1000000,"total":1000000,"elapsed_ms":8200}
  ```

## Dependencies

This builds on:
- `src/lib/clickhouse.ts` — ClickHouse client singleton (F1)
- `src/lib/seed.ts` — exports `mulberry32`, `generateUsers` (pattern), `buildIdentityMappings` (pattern), `generateEvents` (pattern), and property generation helpers (F15)
- `src/lib/identity.ts` — identity resolution types/logic (F4)
- `scripts/schema.sql` — events and identity_mappings table schemas (F2)

## Files to create or modify

- CREATE `src/lib/generator.ts` — core generation engine: job state store (`Map<string, JobState>`), `startGenerationJob()` async loop, batch event generation, batch insert, cancel support, job listing
- CREATE `src/app/api/generate/start/route.ts` — `POST /api/generate/start` handler: validate config, create job, kick off async generation, return `{ job_id }`
- CREATE `src/app/api/generate/[job_id]/status/route.ts` — `GET /api/generate/[job_id]/status` SSE handler: stream progress events from job state
- CREATE `src/app/api/generate/[job_id]/cancel/route.ts` — `POST /api/generate/[job_id]/cancel` handler: set cancellation flag
- CREATE `src/app/api/generate/jobs/route.ts` — `GET /api/generate/jobs` handler: list recent jobs
- CREATE `src/lib/__tests__/generator.test.ts` — unit tests for generation engine

## Implementation order

1. **Create `src/lib/generator.ts`** — Define `JobState` type and `JobConfig` type. Create the in-memory `Map<string, JobState>` store. Implement `generateBatchEvents()` function that produces a batch of up to 10,000 events using `mulberry32` PRNG, respecting the config's event types, weights, user pool, date range, anonymous ratio, and numeric variance. Implement `startGenerationJob(config)` that creates a job, kicks off an async loop inserting batches into ClickHouse via `clickhouse.insert()`, updates job state after each batch (inserted count, throughput, ETA), checks cancellation flag between batches, inserts identity mappings after all event batches complete, and marks job complete/failed/cancelled. Implement `getJob(id)`, `cancelJob(id)`, `listJobs()` helpers.

2. **Create `src/app/api/generate/start/route.ts`** — POST handler that validates the config body (total: 1–1,000,000; users: ≥1; valid date range; etc.), calls `startGenerationJob()`, and returns `{ job_id }` with status 201.

3. **Create `src/app/api/generate/[job_id]/status/route.ts`** — GET handler that returns an SSE stream. Polls the job state every 500ms, emits progress data events with status/inserted/total/throughput/eta_seconds/elapsed_ms. Closes the stream when job reaches terminal state (complete/failed/cancelled).

4. **Create `src/app/api/generate/[job_id]/cancel/route.ts`** — POST handler that calls `cancelJob(id)`, returns `{ cancelled: true }` or 404 if job not found.

5. **Create `src/app/api/generate/jobs/route.ts`** — GET handler that calls `listJobs()` and returns the array of job summaries.

6. **Create `src/lib/__tests__/generator.test.ts`** — Unit tests for the generator module (see Test Plan below).

## Sprint contract

- [ ] `pnpm test` → 0 failures
- [ ] `pnpm lint` → exit 0
- [ ] `pnpm typecheck` → exit 0
- [ ] `pnpm build` → exit 0
- [ ] File `src/lib/generator.ts` exists and exports `startGenerationJob`, `getJob`, `cancelJob`, `listJobs`
- [ ] File `src/app/api/generate/start/route.ts` exists and exports `POST`
- [ ] File `src/app/api/generate/[job_id]/status/route.ts` exists and exports `GET`
- [ ] File `src/app/api/generate/[job_id]/cancel/route.ts` exists and exports `POST`
- [ ] File `src/app/api/generate/jobs/route.ts` exists and exports `GET`
- [ ] File `src/lib/__tests__/generator.test.ts` exists
- [ ] **Integration gap**: POST `http://localhost:3000/api/generate/start` with `{"total":100,"users":10}` → response contains `job_id`
- [ ] **Integration gap**: GET `http://localhost:3000/api/generate/jobs` → response is JSON array

## Test plan

- **Test file**: `src/lib/__tests__/generator.test.ts`
- **Module under test**: `src/lib/generator.ts` — `startGenerationJob`, `getJob`, `cancelJob`, `listJobs`, and the internal batch event generation logic
- **Cases to cover**:
  - **Job creation**: `startGenerationJob` with valid config creates a job and returns a job_id; `getJob(id)` retrieves it with status `"queued"` or `"running"`
  - **Config validation / defaults**: missing optional fields are filled with defaults (total=10000, users=100, date range=last 30 days, anonymous_ratio=30, etc.)
  - **Batch event generation**: generated events respect the configured event types and weights; timestamps fall within the configured date range; properties are valid JSON; anonymous users have no user_id; non-anonymous users have both device_id and user_id
  - **Identity mappings**: identity mappings are built correctly from the generated user pool — one mapping per device for non-anonymous users, none for anonymous users
  - **Cancellation**: `cancelJob(id)` sets the cancelled flag; the async loop respects it and stops inserting after the current batch (mock ClickHouse to verify batch count is less than total/10000)
  - **Job listing**: `listJobs()` returns all jobs with correct status and row counts
  - **Job not found**: `getJob("nonexistent")` returns undefined; `cancelJob("nonexistent")` returns false or throws
  - **Completion**: after all batches insert, job status is `"complete"` with correct `inserted` count and `elapsed_ms`
  - **ClickHouse insert calls**: mock `clickhouse.insert` and verify it is called with table `"events"`, format `"JSONEachRow"`, and batches of ≤10,000 rows; verify identity_mappings insert happens after event inserts
  - **Throughput calculation**: verify throughput and ETA fields are computed from inserted count and elapsed time
  - **Invalid config**: total < 1 or > 1,000,000 throws validation error; users < 1 throws; end before start throws
- **Integration gap**: SSE streaming from `/api/generate/[job_id]/status`, HTTP responses from `/api/generate/start`, `/api/generate/jobs`, `/api/generate/[job_id]/cancel` — all require dev server

## Risks and open questions

1. **Timestamp format**: ClickHouse JSONEachRow rejects ISO 8601 `T`/`Z` for DateTime64. The existing seed.ts works around this with `.replace("T", " ").replace("Z", "")`. The generator must apply the same transformation. This is already established in `src/lib/seed.ts:295-296`.

2. **Job state GC**: The in-memory `Map` will grow unboundedly if many jobs are created. The spec says "sufficient for single-machine use" — no GC mechanism is specified. For now, jobs remain in memory until the server restarts. A future feature could prune completed jobs older than N minutes.

3. **Concurrent SSE clients**: Multiple clients may subscribe to the same job's status SSE. Each gets an independent polling interval. This is fine for local use but worth noting.
