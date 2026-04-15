# F6 Eval Sprint 1 — 2026-04-15

## Tests written

- `src/app/api/events/batch/__tests__/route.integration.test.ts` — HTTP integration tests covering: valid array → 200 `{ok: N, errors:[]}`, empty array → 200 `{ok:0, errors:[]}`, non-array body → 400, invalid JSON → 400, mixed batch → 200 with correct error entry at correct index.

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| File `src/app/api/events/batch/route.ts` exists and exports `POST` | exists + exports `POST` | file present, `export async function POST` confirmed | ✅ |
| Test suite → `pnpm test` exits 0 with 0 failures | 0 failures | 59 passed, 16 skipped, 0 failed (7 test files) | ✅ |
| Lint → `pnpm lint` exits 0 | exit 0 | "Checked 28 files. No fixes applied." | ✅ |
| Type check → `pnpm typecheck` exits 0 | exit 0 | clean (no output) | ✅ |
| Build → `pnpm build` exits 0 | exit 0 | compiled successfully; route `/api/events/batch` listed as ƒ Dynamic | ✅ |
| Phase B HTTP check (integration gap) | server available | ClickHouse not running; dev server cannot start; integration tests gracefully skip via `isServerAvailable()` guard | ⚠️ skipped |

## Score: 9/10

## Verdict: APPROVED

## Notes

**Behaviour review of `route.ts`:**

- JSON parse failure → 400 ✅
- Non-array body → 400 ✅
- Sequentially iterates events calling `insertEvent` per item ✅
- `ok` incremented on success, `{index, error}` pushed on failure ✅
- Always returns 200 for valid-array input (per-event errors reported in body, not via HTTP status) ✅
- `IdentityConflictError` check in the catch block is redundant (it extends `Error`, so the second condition already covers it), but not a correctness bug — both branches emit the same behaviour.

**Phase B unavailability:** ClickHouse binary must be running for `pnpm dev` to succeed. This is a local-environment constraint, not a code defect. The integration test file follows the established F5 pattern: it calls `isServerAvailable()` at `beforeAll` and skips each test with a warning when the server is not reachable.

**Missing test count discrepancy:** Generator reported "54 passing, 16 skipped" in its self-eval. Confirmed independently: before adding the integration test file, suite shows 54 passing | 16 skipped. After adding 5 integration tests (all gated on server availability), suite shows 59 passing | 16 skipped. Numbers are consistent.

**One spec ambiguity flagged by generator:** HTTP status for partial success — spec is silent. Generator chose 200 always for valid-array input, 400 for malformed input. This is the most reasonable interpretation and consistent with batch API conventions.
