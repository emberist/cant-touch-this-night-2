# F30 Plan

## Acceptance criteria

From SPEC §7.7 — `GET /api/generate/[job_id]/status` (SSE):

- Streams progress events:
  ```
  data: {"status":"running","inserted":50000,"total":1000000,"throughput":125000,"eta_seconds":7}
  data: {"status":"running","inserted":150000,"total":1000000,"throughput":148000,"eta_seconds":6}
  data: {"status":"complete","inserted":1000000,"total":1000000,"elapsed_ms":8200}
  ```

From SPEC §7.7 — `POST /api/generate/[job_id]/cancel`:

- Sets a cancellation flag checked between batches. Returns `{ cancelled: true }`.

From SPEC §7.7 — `GET /api/generate/jobs`:

- Lists recent generation jobs with status and row counts. Useful to see if a previous run is still in progress.

From SPEC §8 — Component structure:

- `src/app/api/generate/[job_id]/status/route.ts` — SSE progress stream
- `src/app/api/generate/[job_id]/cancel/route.ts` — cancel route
- `src/app/api/generate/jobs/route.ts` — list jobs route

## Dependencies

Builds on F29 (approved — `features/F29-done.md` exists):
- `src/lib/generator.ts` — exports `getJob`, `cancelJob`, `listJobs`, `JobState`, `JobStatus`
- `src/app/api/generate/start/route.ts` — POST handler (needed to create jobs for testing)

F29 already created skeleton implementations of all three route files during its sprint. F30 verifies their correctness and ensures complete test coverage for the route-level behaviour.

Exact file paths imported/extended:
- `src/lib/generator.ts` — `getJob`, `cancelJob`, `listJobs`
- `src/app/api/generate/[job_id]/status/route.ts` (already exists)
- `src/app/api/generate/[job_id]/cancel/route.ts` (already exists)
- `src/app/api/generate/jobs/route.ts` (already exists)

## Files to create or modify

- VERIFY `src/app/api/generate/[job_id]/status/route.ts` — GET handler returning SSE stream; polls job state every 500ms; emits running payloads with `status/inserted/total/throughput/eta_seconds`; emits complete payload with `status/inserted/total/elapsed_ms`; closes stream on terminal status (complete/failed/cancelled); returns 404 for unknown job_id
- VERIFY `src/app/api/generate/[job_id]/cancel/route.ts` — POST handler calling `cancelJob(id)`; returns `{ cancelled: true }` on success; returns 404 for unknown job_id
- VERIFY `src/app/api/generate/jobs/route.ts` — GET handler calling `listJobs()`; returns JSON array of job state objects
- MODIFY `src/app/api/generate/__tests__/route.integration.test.ts` — add unit-testable route handler tests (import route handlers directly, not via HTTP) for status SSE format, cancel 404/200, and jobs listing

## Implementation order

1. **Review `src/app/api/generate/[job_id]/status/route.ts`** — Verify the SSE handler: returns `Content-Type: text/event-stream` with `Cache-Control: no-cache` and `Connection: keep-alive`; polls `getJob()` every 500ms; emits `data:` lines with JSON payload matching spec format (running: `{status, inserted, total, throughput, eta_seconds}`, complete: `{status, inserted, total, elapsed_ms}`); closes stream on terminal status; returns 404 JSON for unknown job_id. Fix any discrepancies.

2. **Review `src/app/api/generate/[job_id]/cancel/route.ts`** — Verify the POST handler: calls `cancelJob(id)` from generator; returns `{ cancelled: true }` with 200 on success; returns `{ error: "Job not found." }` with 404 on unknown id. Fix any discrepancies.

3. **Review `src/app/api/generate/jobs/route.ts`** — Verify the GET handler: calls `listJobs()` from generator; returns JSON array. Fix any discrepancies.

4. **Add route-level unit tests** — Add tests to `src/app/api/generate/__tests__/route.integration.test.ts` (or a new unit test file) that import the route handlers directly and verify: status SSE returns correct Content-Type header and SSE data format, cancel returns correct response shapes, jobs returns an array with expected fields.

## Sprint contract

- [ ] `pnpm test` → 0 failures
- [ ] `pnpm lint` → exit 0
- [ ] `pnpm typecheck` → exit 0
- [ ] `pnpm build` → exit 0
- [ ] File `src/app/api/generate/[job_id]/status/route.ts` exists and exports `GET`
- [ ] File `src/app/api/generate/[job_id]/cancel/route.ts` exists and exports `POST`
- [ ] File `src/app/api/generate/jobs/route.ts` exists and exports `GET`
- [ ] **Integration gap**: GET `http://localhost:3000/api/generate/{job_id}/status` (after creating a job via POST `/api/generate/start`) → response has `Content-Type: text/event-stream` and body contains `data:` lines with JSON including `"status"` and `"inserted"` fields
- [ ] **Integration gap**: POST `http://localhost:3000/api/generate/{job_id}/cancel` → response contains `{"cancelled":true}`
- [ ] **Integration gap**: POST `http://localhost:3000/api/generate/nonexistent/cancel` → 404 with `{"error":"Job not found."}`
- [ ] **Integration gap**: GET `http://localhost:3000/api/generate/jobs` → response is JSON array; each element has `job_id`, `status`, `inserted`, and `total` fields

## Test plan

- **Test file**: `src/app/api/generate/__tests__/route.integration.test.ts` (existing file — extend with additional cases)
- **Module under test**: Route handlers in `src/app/api/generate/[job_id]/status/route.ts` (GET), `src/app/api/generate/[job_id]/cancel/route.ts` (POST), `src/app/api/generate/jobs/route.ts` (GET)
- **Cases to cover**:
  - **Status SSE — unknown job**: GET with nonexistent job_id → 404 JSON response with `error` field (already covered)
  - **Status SSE — existing job**: GET with valid job_id → 200 with `Content-Type: text/event-stream`; stream contains at least one `data:` line with parseable JSON containing `status`, `inserted`, `total` (already covered)
  - **Cancel — unknown job**: POST with nonexistent job_id → 404 (already covered)
  - **Cancel — existing job**: POST with valid job_id → 200 with `{cancelled: true}` (already covered)
  - **Jobs listing — empty**: GET when no jobs → 200 with empty JSON array (covered via unit test in generator.test.ts)
  - **Jobs listing — after creation**: GET after starting a job → array includes the new job with matching `job_id` and `total` (already covered)
- **Integration gap**: Full SSE streaming behaviour (verifying the complete → close sequence, running payload format with throughput/eta_seconds, complete payload with elapsed_ms) — requires dev server with ClickHouse for realistic job progression

## Risks and open questions

None. All three routes were already implemented as part of F29 and passed evaluation. F30's scope is verification and ensuring test coverage for the route-level behaviour is complete. The existing integration tests already cover the core happy paths and error cases.
