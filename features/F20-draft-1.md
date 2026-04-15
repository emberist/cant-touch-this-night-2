# F20 Sprint 1 — 2026-04-15

## Test files written

- `src/components/ui/__tests__/JsonChip.test.tsx` — covers: renders chip preview for multi-key JSON, renders "No properties" for `{}` and empty string, expansion shows full JSON content, no properties not shown when props present
- `src/components/ui/__tests__/IdentityChip.test.tsx` — covers: renders resolved_id text, wraps in link element, href uses encodeURIComponent, handles special characters
- `src/components/explore/__tests__/useEventExplorer.test.ts` — covers: initial fetch on mount, loading state during/after fetch, hasMore true/false based on next_cursor, loadMore appends with cursor, setFilter re-fetches with event_name param, setFilter resets events, setFilter updates filter state, null filter clears event_name param

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| `pnpm test` 0 failures | ✅ | 292 passing, 25 skipped (pre-existing skips), 0 failing |
| `pnpm lint` exit 0 | ✅ | 4 warnings in pre-existing `seed.test.ts`; no new warnings |
| `pnpm typecheck` exit 0 | ✅ | |
| `pnpm build` exit 0 | ✅ | ECONNREFUSED logs are expected (no ClickHouse at build time) |
| `src/components/ui/JsonChip.tsx` exists | ✅ | Exports `JsonChip` |
| `src/components/ui/IdentityChip.tsx` exists | ✅ | Exports `IdentityChip` |
| `src/components/EventTable.tsx` exists | ✅ | Exports `EventTable` |
| `src/components/explore/EventFilterBar.tsx` exists | ✅ | Exports `EventFilterBar` |
| `src/components/explore/useEventExplorer.ts` exists | ✅ | Exports `useEventExplorer` |
| `src/app/explore/page.tsx` imports `EventTable` | ✅ | |
| HTTP GET `/explore` contains `Event Explorer` | ✅ | Verified against production build |
| HTTP GET `/explore` contains `data-testid="event-table"` | ✅ | Table always rendered; empty state shown inside table body |

## Files created / modified

- **CREATED** `src/components/ui/JsonChip.tsx` — collapsible JSON chip; empty state for `{}` or blank; Popover expansion on click
- **CREATED** `src/components/ui/IdentityChip.tsx` — resolved identity chip wrapping Next.js `<Link>` to `/users/[encoded_id]`
- **CREATED** `src/components/EventTable.tsx` — MUI Table with IntersectionObserver-based infinite scroll sentinel; `data-testid="event-table"`; inline empty-state row; loading Skeleton row
- **CREATED** `src/components/explore/EventFilterBar.tsx` — MUI Autocomplete populated from `/api/schema` on mount
- **CREATED** `src/components/explore/useEventExplorer.ts` — custom hook managing events, cursor, loading, hasMore, filter; `fetchEvents` via `useCallback([], [])` for stable ref; initial load via `useEffect([fetchEvents])`
- **MODIFIED** `src/app/explore/page.tsx` — replaced placeholder with full Explorer page (client component); composes EventFilterBar + EventTable
- **CREATED** `src/components/ui/__tests__/JsonChip.test.tsx` — unit tests with `// @vitest-environment jsdom`
- **CREATED** `src/components/ui/__tests__/IdentityChip.test.tsx` — unit tests with `// @vitest-environment jsdom`
- **CREATED** `src/components/explore/__tests__/useEventExplorer.test.ts` — unit tests with `// @vitest-environment jsdom`
- **MODIFIED** `package.json` — added `jsdom` and `@testing-library/react` as devDependencies

## Known gaps

None — all sprint contract criteria passed.

## Issues logged

### `@testing-library/react` auto-cleanup requires explicit call in vitest

vitest does not inject `afterEach` into `globalThis` unless `globals: true` is set in `vitest.config.ts`. Since this project uses explicit imports (`import { afterEach } from "vitest"`), `@testing-library/react` cannot detect the test framework and auto-cleanup does not fire. Fix: import `cleanup` from `@testing-library/react` and call it explicitly in `afterEach`. Applied in both component test files.

### MUI v9 Box does not accept shorthand system props as direct JSX attributes

`<Box mb={2}>` and `<Box p={2}>` cause TypeScript errors in MUI v9. Use `<Box sx={{ mb: 2 }}>` and `<Box sx={{ p: 2 }}>` instead.
