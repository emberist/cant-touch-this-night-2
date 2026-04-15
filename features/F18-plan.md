# F18 Plan

## Acceptance criteria

From SPEC §7.1 — Navigation Shell (`/`):

- Persistent left sidebar with links: Explore, Trends, Funnels, Users, Test (for developers), Generate (bulk event generation)
- Navigation via MUI sidebar
- Dashboard home (`/`) shows headline metrics: total events, total users, most common event in the last 7 days

From SPEC §8 — Component Structure:

- `src/app/layout.tsx` — MUI theme provider, sidebar shell
- `src/components/Sidebar.tsx` — sidebar component

**Scope note:** This feature covers the navigation shell and sidebar only. The dashboard home headline metrics require API routes (ClickHouse queries) that are not part of this feature — those will be a separate feature. The home page should render placeholder/empty-state content for now. Route pages (`/explore`, `/trends`, `/funnels`, `/users`, `/test`, `/generate`) need stub pages so navigation links resolve without 404.

## Dependencies

No completed feature sentinel files exist (`features/F*-done`). This feature has no runtime dependencies on prior features — the sidebar is purely frontend UI.

Files that will be extended:
- `src/app/layout.tsx` — existing root layout with `AppRouterCacheProvider` already configured
- `src/app/page.tsx` — existing home page (will be replaced with dashboard shell)

## Files to create or modify

- MODIFY `src/app/layout.tsx` — wrap children with sidebar shell layout
- CREATE `src/components/Sidebar.tsx` — MUI Drawer-based persistent sidebar with navigation links
- MODIFY `src/app/page.tsx` — replace boilerplate with dashboard home placeholder
- CREATE `src/app/explore/page.tsx` — stub page
- CREATE `src/app/trends/page.tsx` — stub page
- CREATE `src/app/funnels/page.tsx` — stub page
- CREATE `src/app/users/page.tsx` — stub page
- CREATE `src/app/test/page.tsx` — stub page
- CREATE `src/app/generate/page.tsx` — stub page

## Implementation order

1. Create `src/components/Sidebar.tsx` — MUI `Drawer` (permanent variant) with `List`, `ListItemButton`, `ListItemIcon`, `ListItemText` for each route. Use `next/link` for navigation. Highlight active route using `usePathname()`. This is a Client Component (`"use client"`).

2. Modify `src/app/layout.tsx` — import `Sidebar`, render it alongside `{children}` in a flex layout. The sidebar is fixed-width on the left; the main content area fills the remaining space with appropriate padding.

3. Modify `src/app/page.tsx` — replace Next.js boilerplate with a simple dashboard placeholder showing the page title "Dashboard" using MUI `Typography`. (Headline metrics will be added in a later feature when the query APIs are wired up.)

4. Create stub pages for all navigation targets (`/explore`, `/trends`, `/funnels`, `/users`, `/test`, `/generate`) — each exports a default component with an MUI `Typography` heading matching the page name.

## Sprint contract

- [ ] Type check: `pnpm typecheck` exits 0
- [ ] Lint check: `pnpm lint` exits 0
- [ ] Build check: `pnpm build` exits 0
- [ ] Test suite: `pnpm test` exits 0 (no regressions)
- [ ] File `src/components/Sidebar.tsx` exists and exports a default component
- [ ] File `src/app/explore/page.tsx` exists and exports a default component
- [ ] File `src/app/trends/page.tsx` exists and exports a default component
- [ ] File `src/app/funnels/page.tsx` exists and exports a default component
- [ ] File `src/app/users/page.tsx` exists and exports a default component
- [ ] File `src/app/test/page.tsx` exists and exports a default component
- [ ] File `src/app/generate/page.tsx` exists and exports a default component
- [ ] HTTP check: GET `http://localhost:3000/` contains `Dashboard`
- [ ] HTTP check: GET `http://localhost:3000/` contains `Explore` (sidebar link text)
- [ ] HTTP check: GET `http://localhost:3000/` contains `Trends` (sidebar link text)
- [ ] HTTP check: GET `http://localhost:3000/` contains `Funnels` (sidebar link text)
- [ ] HTTP check: GET `http://localhost:3000/` contains `Users` (sidebar link text)
- [ ] HTTP check: GET `http://localhost:3000/` contains `Test` (sidebar link text)
- [ ] HTTP check: GET `http://localhost:3000/` contains `Generate` (sidebar link text)
- [ ] HTTP check: GET `http://localhost:3000/explore` contains `Explore`
- [ ] HTTP check: GET `http://localhost:3000/trends` contains `Trends`
- [ ] HTTP check: GET `http://localhost:3000/funnels` contains `Funnels`
- [ ] HTTP check: GET `http://localhost:3000/users` contains `Users`
- [ ] HTTP check: GET `http://localhost:3000/test` contains `Test`
- [ ] HTTP check: GET `http://localhost:3000/generate` contains `Generate`

## Test plan

This feature is purely presentational UI (a sidebar with links and stub pages). There is no business logic, no data transformation, no state management, and no conditional behavior beyond active-route highlighting (which is a trivial `usePathname()` comparison).

All sprint contract criteria are verified via:
- Static checks (type check, lint, build)
- HTTP checks (sidebar renders link text, stub pages render headings)

Writing unit tests for these components would be testing MUI's rendering and Next.js's routing — both are third-party concerns. There is no module-under-test that would catch a realistic bug.

**Integration gap:** All HTTP checks require the dev server running. Active-route highlighting behavior requires navigation interaction (e2e territory).

## Risks and open questions

1. **MUI Drawer + App Router SSR**: The `Sidebar` component uses `usePathname()` (a Client Component hook). The sidebar must be marked `"use client"`. The layout itself can remain a Server Component as long as it imports the client `Sidebar` as a child component — this is standard Next.js composition.

2. **Sidebar width**: The spec does not prescribe a specific width. A standard 240px permanent drawer is a reasonable default.

3. **MUI icons**: The spec shows icons in the sidebar (via `ListItemIcon`). `@mui/icons-material` is not in `package.json`. The implementation should either add the dependency or use simple text/emoji placeholders. Given the spec mentions MUI sidebar with icons, adding `@mui/icons-material` is appropriate.
