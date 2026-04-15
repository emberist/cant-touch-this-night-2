# F14 Eval Sprint 1 — 2026-04-15

## Tests written

No new test files written. The plan marked the HTTP checks as an integration gap; I verified them live in Phase B using a direct ClickHouse insert (see notes). All pre-written test files were confirmed present and passing:

- `src/app/api/users/[id]/__tests__/route.test.ts` — 200 profile shape, id forwarding, 404 not found, 500 on throw
- `src/lib/__tests__/users.test.ts` — getUserProfile profile shape, identity_cluster, null when not found
- `src/lib/__tests__/users.integration.test.ts` — integration tests (skipped without live ClickHouse during unit run)

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| File `src/app/api/users/[id]/route.ts` exists and exports `GET` | File exists, exports `GET` | ✅ Present; exports `GET(request, ctx)` with correct signature | ✅ |
| Test suite → 0 failures (`pnpm test`) | 0 failures | 211 passed, 25 skipped (integration tests, no live CH) | ✅ |
| Linter → exit 0 (`pnpm lint`) | exit 0 | exit 0; "Checked 52 files, no fixes applied" | ✅ |
| Type check → exit 0 (`pnpm typecheck`) | exit 0 | exit 0; no errors | ✅ |
| Build → exit 0 (`pnpm build`) | exit 0 | exit 0; `/api/users/[id]` appears as dynamic route (ƒ) | ✅ |
| HTTP: GET `/api/users/nonexistent-id-12345` → 404 + `"error"` | status 404, body has `"error"` | status 404, body `{"error":"User \"nonexistent-id-12345\" not found."}` | ✅ |
| HTTP: seed → find user → GET `/api/users/{id}` → 200 + `"resolved_id"`, `"identity_cluster"`, `"events"` | status 200, body has all three keys | status 200, body contains all required keys with correct structure | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

- **No `/api/seed` route**: The sprint contract HTTP check references `POST /api/seed`, but that route is not yet implemented (no file at `src/app/api/seed/route.ts`). The 200 HTTP check was satisfied by inserting a test event directly into ClickHouse (`INSERT INTO minipanel.events ...`) and querying the user profile endpoint. The route logic itself is correct and complete — this is a test infrastructure gap, not a route correctness gap. The `/api/seed` route is out of scope for F14.

- **ClickHouse password**: The local ClickHouse binary runs with an empty password for the `default` user, but the `src/lib/clickhouse.ts` default is `"password"`. A `.env.local` with `CLICKHOUSE_PASSWORD=` (empty) was created to make HTTP checks work. This file is gitignored and would need to be created on any fresh checkout. Consider documenting this in the README or creating a `.env.local.example`.

- **Route implementation is minimal and correct**: The route delegates entirely to `getUserProfile`, wraps in try/catch, returns 404 on null and 500 on error — exactly as specified. The unit tests validate all branches.

- **Identity cluster correctness verified**: The live HTTP check confirmed `identity_cluster.device_ids` includes the associated device even when the event was sent with `user_id` directly (not via mapping), because the cluster query uses `DISTINCT e.device_id`.
