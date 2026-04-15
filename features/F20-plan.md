# F20 Plan

## Acceptance criteria

From SPEC.md §7.2 — Event Explorer (`/explore`):

- Table of events, newest first
- Columns: Timestamp, Event Name, Resolved Identity, Properties (collapsed JSON chip, expandable)
- Filter bar: event name dropdown (populated from `/api/schema`)
- Virtual scroll / infinite scroll using cursor pagination
- Clicking a resolved identity navigates to `/users/[id]`

## Dependencies

Completed features this builds on:

- **F1** (ClickHouse client singleton) — `src/lib/clickhouse.ts`
- **F7** (GET /api/events/list with cursor pagination) — `src/app/api/events/list/route.ts`
- **F8** (GET /api/schema) — `src/app/api/schema/route.ts`
- **F9** (In-memory schema cache) — `src/lib/schema-cache.ts`
- **F18** (MUI navigation shell) — `src/app/layout.tsx`, `src/components/Sidebar.tsx`

Key files that will be imported or extended:

- `src/app/explore/page.tsx` — existing placeholder to replace
- `src/lib/identity.ts` — `EventRow` type, `queryEventsWithResolvedId` function
- `src/app/api/events/list/route.ts` — backend already implemented; consumed via fetch
- `src/app/api/schema/route.ts` — backend already implemented; consumed via fetch

## Files to create or modify

- CREATE `src/components/EventTable.tsx` — client component: renders the event table with expandable property rows
- CREATE `src/components/ui/JsonChip.tsx` — client component: collapsed/expandable JSON properties display
- CREATE `src/components/ui/IdentityChip.tsx` — client component: resolved identity as a clickable chip linking to `/users/[id]`
- CREATE `src/components/explore/EventFilterBar.tsx` — client component: event name autocomplete dropdown populated from `/api/schema`
- CREATE `src/components/explore/useEventExplorer.ts` — custom hook: manages fetch state, cursor pagination, infinite scroll trigger
- MODIFY `src/app/explore/page.tsx` — replace placeholder with full Explorer page composing filter bar + event table

## Implementation order

1. **Create `src/components/ui/JsonChip.tsx`** — A small MUI Chip that shows a truncated JSON preview. Clicking it expands to show the full formatted JSON in a popover or inline collapse. Receives `properties: string` (JSON string) as prop.

2. **Create `src/components/ui/IdentityChip.tsx`** — A MUI Chip that displays the resolved_id. Wraps a Next.js `<Link>` to `/users/[encodeURIComponent(resolved_id)]`. Receives `resolved_id: string` as prop.

3. **Create `src/components/EventTable.tsx`** — Client component. Renders a MUI `Table` with columns: Timestamp, Event Name, Resolved Identity (using `IdentityChip`), Properties (using `JsonChip`). Receives `events: EventRow[]` and `loading: boolean` props. Includes a loading skeleton row at the bottom when `loading` is true (infinite scroll indicator). Includes an `onLoadMore` callback prop and an `IntersectionObserver` on the last row to trigger it. Includes `hasMore: boolean` prop to control whether the observer is active.

4. **Create `src/components/explore/EventFilterBar.tsx`** — Client component. Fetches event names from `/api/schema` on mount. Renders a MUI `Autocomplete` dropdown for filtering by event name. Calls an `onFilterChange(eventName: string | null)` callback when selection changes.

5. **Create `src/components/explore/useEventExplorer.ts`** — Custom hook that manages: (a) current event_name filter, (b) fetched events array, (c) next_cursor for pagination, (d) loading state, (e) `loadMore()` function that fetches the next page from `/api/events/list?event_name=...&before=...&limit=50` and appends results, (f) `setFilter(eventName)` that resets events and cursor and re-fetches. Returns `{ events, loading, hasMore, loadMore, filter, setFilter }`.

6. **Modify `src/app/explore/page.tsx`** — Replace the placeholder. Compose: page title "Event Explorer", `EventFilterBar` wired to `useEventExplorer.setFilter`, `EventTable` wired to `useEventExplorer` state. The page itself is a client component (needs state for infinite scroll). Show an empty state message when there are no events.

## Sprint contract

- [ ] `pnpm test` (vitest run) → 0 failures
- [ ] `pnpm lint` (biome check) → exit 0
- [ ] `pnpm typecheck` (tsc --noEmit) → exit 0
- [ ] `pnpm build` (next build) → exit 0
- [ ] File `src/components/ui/JsonChip.tsx` exists and exports a default or named `JsonChip` component
- [ ] File `src/components/ui/IdentityChip.tsx` exists and exports a default or named `IdentityChip` component
- [ ] File `src/components/EventTable.tsx` exists and exports a default or named `EventTable` component
- [ ] File `src/components/explore/EventFilterBar.tsx` exists and exports a default or named `EventFilterBar` component
- [ ] File `src/components/explore/useEventExplorer.ts` exists and exports a `useEventExplorer` function
- [ ] File `src/app/explore/page.tsx` exists and imports `EventTable`
- [ ] HTTP check: GET `http://localhost:3000/explore` → response contains `Event Explorer`
- [ ] HTTP check: GET `http://localhost:3000/explore` → response contains `data-testid="event-table"` or a table element

## Test plan

- **Test file**: `src/components/ui/__tests__/JsonChip.test.tsx`
- **Module under test**: `JsonChip`
- **Cases to cover**:
  - Renders a chip with truncated text for a JSON string with multiple keys
  - Renders "No properties" or empty state for `{}` or empty string
  - Expanding shows the full JSON content

- **Test file**: `src/components/ui/__tests__/IdentityChip.test.tsx`
- **Module under test**: `IdentityChip`
- **Cases to cover**:
  - Renders the resolved_id text
  - Links to `/users/[encoded_id]`
  - Handles special characters in resolved_id (URL encoding)

- **Test file**: `src/components/explore/__tests__/useEventExplorer.test.ts`
- **Module under test**: `useEventExplorer`
- **Cases to cover**:
  - Initial fetch loads first page of events from `/api/events/list`
  - `loadMore()` appends next page using the cursor
  - `setFilter(eventName)` resets events and re-fetches with the filter
  - `hasMore` is false when the API returns `next_cursor: null`
  - Sets loading state correctly during fetch

- **Integration gap**: HTTP check for GET `/explore` rendering the full page with event table — requires dev server
- **Integration gap**: Infinite scroll behavior (IntersectionObserver triggering `loadMore`) — requires browser environment / e2e test
- **Integration gap**: EventFilterBar fetching from `/api/schema` and populating dropdown — requires running API

## Risks and open questions

1. **Vitest + React component testing**: The project uses `environment: "node"` in vitest.config.ts. Component tests with React rendering (e.g., `@testing-library/react`) require `jsdom` or `happy-dom` environment. The generator should either add `// @vitest-environment jsdom` directives to component test files or install and configure a DOM environment. Check if `@testing-library/react` is already installed; if not, it will need to be added as a devDependency.

2. **Timestamp display format**: The spec doesn't specify how timestamps should be formatted in the table. The implementation should use a human-readable format (e.g., `YYYY-MM-DD HH:mm:ss`) that is clear and sortable.

3. **Empty state**: The spec doesn't detail what to show when no events exist. The implementation should show a clear empty state message guiding users to seed data or send events.
