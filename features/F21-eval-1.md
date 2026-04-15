# F21 Eval Sprint 1 — 2026-04-15

## Tests written

No new test files written. The generator's existing test files fully cover all acceptance criteria:

- `src/components/ui/__tests__/JsonChip.test.tsx` — covers: empty JSON renders "No properties", empty string renders "No properties", clickable chip with key preview, first key in preview, expansion reveals full JSON, full JSON hidden before click (6 tests)
- `src/components/ui/__tests__/IdentityChip.test.tsx` — covers: renders resolved_id text, wraps in link element, links to percent-encoded `/users/[id]`, handles special characters, renders device-style IDs (5 tests)

No integration or e2e gaps identified. Both components are pure UI with no HTTP endpoints. jsdom tests cover all interactive behaviour (click, expand, link navigation).

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| File `src/components/ui/JsonChip.tsx` exists and exports `JsonChip` | File exists, named export | File exists, `export function JsonChip` | ✅ |
| File `src/components/ui/IdentityChip.tsx` exists and exports `IdentityChip` | File exists, named export | File exists, `export function IdentityChip` | ✅ |
| `JsonChip` accepts a `properties: string` prop | `properties: string` | `interface JsonChipProps { properties: string }` | ✅ |
| `IdentityChip` accepts a `resolved_id: string` prop | `resolved_id: string` | `interface IdentityChipProps { resolved_id: string }` | ✅ |
| `JsonChip` renders "No properties" for empty JSON (`"{}"` or `""`) | Chip label "No properties" | `if (keys.length === 0) return <Chip label="No properties" …/>` | ✅ |
| `JsonChip` renders a clickable chip with key preview for non-empty JSON | Clickable chip, key names in label | `<Chip label={preview} onClick={…} aria-label="Show properties"/>` | ✅ |
| `JsonChip` expands to show full pretty-printed JSON on click | Popover with `JSON.stringify(parsed, null, 2)` | Popover opens on click, renders `JSON.stringify(parsed, null, 2)` in `<pre>` | ✅ |
| `IdentityChip` renders `resolved_id` as chip label text | Chip with `resolved_id` label | `<Chip label={resolved_id} …/>` | ✅ |
| `IdentityChip` wraps in a link to `/users/[percent-encoded-id]` | `href="/users/<encoded>"` | `href={\`/users/${encodeURIComponent(resolved_id)}\`}` | ✅ |
| Test suite → 0 failures (`pnpm test`) | 0 failures | 295 passed, 25 skipped, 0 failures | ✅ |
| Linter → exit 0 (`pnpm lint`) | exit 0 | exit 0; 4 pre-existing warnings in `src/lib/__tests__/seed.test.ts` (not F21 files) | ✅ |
| Type check → exit 0 (`pnpm typecheck`) | exit 0 | exit 0, no errors | ✅ |
| Build → exit 0 (`pnpm build`) | exit 0 | exit 0; ClickHouse ECONNREFUSED during static gen is expected (no server at build time) | ✅ |

## Score: 10/10

## Verdict: APPROVED

## Notes

Both components were fully implemented in F20. This sprint was a verification pass only. No regressions found, no spec gaps. All 13 criteria pass.
