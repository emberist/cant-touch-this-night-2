# F21 Plan

## Acceptance criteria

From SPEC §8 Component Structure and §7.2 Event Explorer:

- `src/components/ui/JsonChip.tsx` exists as a shared UI component
- JsonChip receives a `properties` string (JSON blob), displays a collapsed chip showing a short preview of property keys
- Clicking the JsonChip expands to show the full pretty-printed JSON content
- JsonChip shows "No properties" for empty/invalid JSON
- `src/components/ui/IdentityChip.tsx` exists as a shared UI component
- IdentityChip receives a `resolved_id` string and renders it as a clickable chip
- Clicking an IdentityChip navigates to `/users/[id]` (with proper URL encoding)

## Dependencies

No completed feature sentinel files (`features/F*-done`) exist yet. However, this feature depends on:

- **F18** (MUI navigation shell) — provides the MUI theme context and layout used by these components
- **F20** (Event Explorer) — the components were initially created as part of F20 and are already consumed by `EventTable`

Exact file paths imported or extended:
- `src/components/ui/JsonChip.tsx` — already exists, created during F20
- `src/components/ui/IdentityChip.tsx` — already exists, created during F20
- `src/components/ui/__tests__/JsonChip.test.tsx` — already exists
- `src/components/ui/__tests__/IdentityChip.test.tsx` — already exists

## Files to create or modify

Both components and their tests already exist with full implementations from F20. The current implementations match all spec requirements:

- EXISTING `src/components/ui/JsonChip.tsx` — collapsed chip with key preview, expandable popover with pretty-printed JSON, "No properties" empty state
- EXISTING `src/components/ui/IdentityChip.tsx` — clickable chip with `resolved_id` label, links to `/users/[encodeURIComponent(id)]`
- EXISTING `src/components/ui/__tests__/JsonChip.test.tsx` — 6 tests covering empty state, preview, expansion
- EXISTING `src/components/ui/__tests__/IdentityChip.test.tsx` — 5 tests covering rendering, linking, URL encoding

No files need to be created or modified. The sprint is to verify that existing implementations satisfy all acceptance criteria.

## Implementation order

1. Verify `src/components/ui/JsonChip.tsx` exports `JsonChip` with correct interface (`properties: string`)
2. Verify `src/components/ui/IdentityChip.tsx` exports `IdentityChip` with correct interface (`resolved_id: string`)
3. Verify existing tests pass (`pnpm test`)
4. Verify type checker passes (`pnpm typecheck`)
5. Verify linter passes (`pnpm lint`)
6. Verify build passes (`pnpm build`)

## Sprint contract

- [ ] File `src/components/ui/JsonChip.tsx` exists and exports `JsonChip`
- [ ] File `src/components/ui/IdentityChip.tsx` exists and exports `IdentityChip`
- [ ] `JsonChip` accepts a `properties: string` prop
- [ ] `IdentityChip` accepts a `resolved_id: string` prop
- [ ] `JsonChip` renders "No properties" chip for empty JSON (`"{}"` or `""`)
- [ ] `JsonChip` renders a clickable chip with key preview for non-empty JSON
- [ ] `JsonChip` expands to show full pretty-printed JSON on click
- [ ] `IdentityChip` renders `resolved_id` as chip label text
- [ ] `IdentityChip` wraps in a link to `/users/[percent-encoded-id]`
- [ ] Test suite → 0 failures (`pnpm test`)
- [ ] Linter → exit 0 (`pnpm lint`)
- [ ] Type check → exit 0 (`pnpm typecheck`)
- [ ] Build → exit 0 (`pnpm build`)

## Test plan

Existing test files already cover all required cases:

- **Test file**: `src/components/ui/__tests__/JsonChip.test.tsx`
- **Module under test**: `JsonChip`
- **Cases covered**: empty JSON renders "No properties", empty string renders "No properties", non-empty JSON renders clickable chip with key preview, preview includes first key name, clicking chip reveals full JSON, full JSON not visible before click

- **Test file**: `src/components/ui/__tests__/IdentityChip.test.tsx`
- **Module under test**: `IdentityChip`
- **Cases covered**: renders resolved_id text, wraps in link element, links to percent-encoded user path, handles special characters in URL encoding, renders device-style IDs

No new tests need to be written — the existing test suites fully cover the acceptance criteria.

## Risks and open questions

None. Both components and their tests already exist with complete implementations from F20. This feature is effectively already done — the sprint is purely a verification pass.
