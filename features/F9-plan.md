# F9 Plan

## Acceptance criteria

From SPEC.md §6.3 — Schema / Autocomplete:

- Cached in memory for 60 seconds.

From SPEC.md §8 — Component Structure:

- `src/lib/schema-cache.ts` — In-memory schema cache

## Dependencies

This feature builds on code created during F8 (commit `274ebae`). The file `src/lib/schema-cache.ts` and its tests `src/lib/__tests__/schema-cache.test.ts` were created as part of the F8 sprint. No `features/F*-done` sentinel files exist yet.

Exact file paths that will be imported or extended:
- `src/lib/schema-cache.ts` — already exists; created during F8
- `src/app/api/schema/route.ts` — already imports and uses the cache

## Files to create or modify

- MODIFY `src/lib/schema-cache.ts` — verify existing implementation meets spec (60-second TTL, `getCachedSchema`/`setCachedSchema`/`invalidateSchemaCache` exports). No changes expected unless defects found.
- MODIFY `src/lib/__tests__/schema-cache.test.ts` — verify existing tests cover all acceptance criteria. No changes expected unless gaps found.

## Implementation order

1. **Verify `src/lib/schema-cache.ts`** — confirm the module exports `getCachedSchema`, `setCachedSchema`, `invalidateSchemaCache`, and the `SchemaResponse` type. Confirm the TTL is 60 seconds (60,000 ms). Confirm `getCachedSchema` returns `null` when the cache is empty or expired, and returns the stored value when within TTL. Confirm `setCachedSchema` stores the value with a timestamp. Confirm `invalidateSchemaCache` clears the entry.

2. **Verify `src/lib/__tests__/schema-cache.test.ts`** — confirm tests cover: empty cache returns null, cache hit within TTL, cache miss after TTL expiry, manual invalidation, re-set after invalidation, overwrite with new value.

3. **Verify integration with `/api/schema` route** — confirm `src/app/api/schema/route.ts` calls `getCachedSchema()` before querying ClickHouse and calls `setCachedSchema()` after building the response.

## Sprint contract

- [ ] File `src/lib/schema-cache.ts` exists and exports `getCachedSchema`, `setCachedSchema`, `invalidateSchemaCache`, and `SchemaResponse`
- [ ] `getCachedSchema` returns `null` when no value has been cached
- [ ] `getCachedSchema` returns the cached value when called within 60 seconds of `setCachedSchema`
- [ ] `getCachedSchema` returns `null` when called at or after 60 seconds since `setCachedSchema`
- [ ] `invalidateSchemaCache` clears the cache so `getCachedSchema` returns `null`
- [ ] Test suite → `pnpm test` → 0 failures
- [ ] Lint check → `pnpm lint` → exit 0
- [ ] Type check → `pnpm typecheck` → exit 0
- [ ] Build check → `pnpm build` → exit 0

## Test plan

- **Test file**: `src/lib/__tests__/schema-cache.test.ts`
- **Module under test**: `getCachedSchema`, `setCachedSchema`, `invalidateSchemaCache` from `src/lib/schema-cache.ts`
- **Cases to cover**:
  - Returns `null` when cache is empty (never set)
  - Returns cached value within 60-second TTL window (advance time by 59s, still returns value)
  - Returns `null` after TTL expires (advance time by 60s, returns null)
  - Returns `null` well past TTL expiry (advance time by 120s, returns null)
  - Manual `invalidateSchemaCache()` clears the cache so next `getCachedSchema()` returns `null`
  - After invalidation, `setCachedSchema` with new value → `getCachedSchema` returns the new value
  - Calling `setCachedSchema` twice → `getCachedSchema` returns the most recent value

All cases are unit-testable using `vi.useFakeTimers()` / `vi.advanceTimersByTime()` — no integration gaps.

## Risks and open questions

None. The implementation is straightforward in-memory caching with a time-based TTL. The module was already created during F8 and has comprehensive test coverage. The only risk would be if the module-level `let entry` variable behaves unexpectedly across hot-module reloads in development, but this is a known non-issue for API routes in Next.js (server modules persist across requests within the same process).
