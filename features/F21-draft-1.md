# F21 Sprint 1 — 2026-04-15

## Test files written

No new test files were written. Per the plan, existing test files already cover all required cases:

- `src/components/ui/__tests__/JsonChip.test.tsx` — covers all JsonChip criteria: empty JSON renders "No properties", empty string renders "No properties", clickable chip with key preview, first key in preview, expansion reveals full JSON, full JSON hidden before click (6 tests)
- `src/components/ui/__tests__/IdentityChip.test.tsx` — covers all IdentityChip criteria: renders resolved_id text, wraps in link element, links to percent-encoded `/users/[id]`, handles special characters, renders device-style IDs (5 tests)

## Sprint contract results

| Criterion | Result | Notes |
| --------- | ------ | ----- |
| File `src/components/ui/JsonChip.tsx` exists and exports `JsonChip` | ✅ | Confirmed |
| File `src/components/ui/IdentityChip.tsx` exists and exports `IdentityChip` | ✅ | Confirmed |
| `JsonChip` accepts a `properties: string` prop | ✅ | Typed interface `JsonChipProps` |
| `IdentityChip` accepts a `resolved_id: string` prop | ✅ | Typed interface `IdentityChipProps` |
| `JsonChip` renders "No properties" for empty JSON (`"{}"` or `""`) | ✅ | Covered by 2 passing tests |
| `JsonChip` renders a clickable chip with key preview for non-empty JSON | ✅ | Covered by passing test |
| `JsonChip` expands to show full pretty-printed JSON on click | ✅ | Covered by passing test |
| `IdentityChip` renders `resolved_id` as chip label text | ✅ | Covered by 2 passing tests |
| `IdentityChip` wraps in a link to `/users/[percent-encoded-id]` | ✅ | Covered by 2 passing tests |
| Test suite → 0 failures (`pnpm test`) | ✅ | 295 passed, 25 skipped (integration tests requiring live ClickHouse), 0 failures |
| Linter → exit 0 (`pnpm lint`) | ✅ | Exit 0; 4 pre-existing warnings in `src/lib/__tests__/seed.test.ts` (not F21 files) |
| Type check → exit 0 (`pnpm typecheck`) | ✅ | Exit 0, no errors |
| Build → exit 0 (`pnpm build`) | ✅ | Build completed; ClickHouse ECONNREFUSED during static page generation is expected (no server running at build time) |

## Files created / modified

No files were created or modified. Both components and their tests already existed with complete implementations from F20. This sprint was a verification pass only.

- `src/components/ui/JsonChip.tsx` — existing, unchanged (collapsed chip, key preview, popover expansion, "No properties" empty state)
- `src/components/ui/IdentityChip.tsx` — existing, unchanged (clickable chip, links to `/users/[encodeURIComponent(resolved_id)]`)
- `src/components/ui/__tests__/JsonChip.test.tsx` — existing, unchanged (6 tests, all passing)
- `src/components/ui/__tests__/IdentityChip.test.tsx` — existing, unchanged (5 tests, all passing)

## Known gaps

None. All sprint contract criteria pass.

## Issues logged

None.
