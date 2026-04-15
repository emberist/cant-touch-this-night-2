# F30 Sprint 1 — 2026-04-15

## Test files written

- `src/app/api/generate/__tests__/route.unit.test.ts` — 16 unit tests covering:
  - Status route: unknown job → 404 with error field
  - Status route: known job → 200 with `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
  - Status route: stream immediately enqueues SSE keep-alive comment `:\n\n`
  - Status route: stream emits `data:` line with JSON containing `status`, `inserted`, `total` for complete job
  - Status route: complete payload shape (`elapsed_ms`, no `throughput`/`eta_seconds`)
  - Status route: running payload shape (`throughput`, `eta_seconds`, no `elapsed_ms`)
  - Status route: stream closes after terminal status
  - Cancel route: unknown job → 404 with error field
  - Cancel route: known job → 200 with `{cancelled: true}`
  - Cancel route: calls `cancelJob` with correct job_id
  - Jobs route: returns 200 with JSON array
  - Jobs route: returns empty array when no jobs
  - Jobs route: returned jobs have `job_id`, `status`, `inserted`, `total` fields
  - Jobs route: calls `listJobs` once

## Sprint contract results

| Criterion | Result | Notes |
|---|---|---|
| `pnpm test` → 0 failures | ✅ | 546 passing, 25 skipped (ClickHouse integration), 0 failing |
| `pnpm lint` → exit 0 | ❌ | 1 pre-existing error in `src/components/test/__tests__/useLiveFeed.test.ts` (`noNonNullAssertion`). My new file passes lint after auto-fix. |
| `pnpm typecheck` → exit 0 | ✅ | `tsc --noEmit` exits 0 |
| `pnpm build` → exit 0 | ✅ | Build completes, all routes listed |
| `src/app/api/generate/[job_id]/status/route.ts` exists and exports `GET` | ✅ | Verified |
| `src/app/api/generate/[job_id]/cancel/route.ts` exists and exports `POST` | ✅ | Verified |
| `src/app/api/generate/jobs/route.ts` exists and exports `GET` | ✅ | Verified |
| Integration gap: status SSE → `text/event-stream` with `data:` lines | ⬜ | Requires live server + ClickHouse |
| Integration gap: cancel existing job → `{cancelled:true}` | ⬜ | Requires live server |
| Integration gap: cancel nonexistent → 404 `{error:"Job not found."}` | ⬜ | Requires live server |
| Integration gap: jobs → JSON array with `job_id`/`status`/`inserted`/`total` | ⬜ | Requires live server |

## Files created / modified

- `src/app/api/generate/__tests__/route.unit.test.ts` — **created**: 16 unit tests importing route handlers directly with mocked `@/lib/generator`
- The three route files (`status/route.ts`, `cancel/route.ts`, `jobs/route.ts`) were **verified correct** as shipped by F29 — no changes needed

## Known gaps

- `pnpm lint` exits non-zero due to 1 pre-existing `noNonNullAssertion` error in `src/components/test/__tests__/useLiveFeed.test.ts`. This error existed before this sprint (confirmed by stashing my changes and running lint on the F29 baseline). My new file is clean after `biome check --fix`.
- Integration gaps require a running dev server with ClickHouse and are marked ⬜ above.

## Issues logged

None.
