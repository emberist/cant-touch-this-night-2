# F26 Sprint 1 — 2026-04-15

## Test files written

- `src/components/users/__tests__/useUserProfile.test.ts` — covers all 7 test plan cases:
  - Fetches from `/api/users/{id}` on mount
  - Sets loading to true during fetch, false after completion
  - Populates profile with API response data on success
  - Sets error when API returns 404
  - Sets error when fetch fails (network error)
  - Re-fetches when resolved_id changes
  - URL-encodes the resolved_id (`user@example.com` → `user%40example.com`)

## Sprint contract results

| Criterion | Result | Notes |
| --- | --- | --- |
| Test suite 0 failures | ✅ | 408 passing, 0 failing, 25 skipped |
| Lint exit 0 | ✅ | 7 pre-existing warnings (seed.test.ts, TrendChart files); 0 errors |
| Type check exit 0 | ✅ | No errors |
| Build exit 0 | ✅ | `✓ Compiled successfully`; `/users/[id]` listed as dynamic route |
| `src/components/users/useUserProfile.ts` exists | ✅ | exports `useUserProfile` |
| `src/components/users/__tests__/useUserProfile.test.ts` exists | ✅ | |
| `src/components/UserTimeline.tsx` exists | ✅ | exports `UserTimeline` |
| `src/app/users/[id]/page.tsx` exists and contains `"use client"` | ✅ | |
| HTTP: `data-testid="user-profile"` | integration gap | requires dev server + seeded data |
| HTTP: `data-testid="identity-cluster"` | integration gap | requires dev server + seeded data |
| HTTP: `data-testid="user-timeline"` | integration gap | requires dev server + seeded data |

## Files created / modified

- `src/components/users/__tests__/useUserProfile.test.ts` — created; 8 unit tests for the hook (one minor edit: removed unused `result` destructuring flagged by linter — no logic change)
- `src/components/users/useUserProfile.ts` — created; custom hook fetching `/api/users/{id}`, returning `{ profile, loading, error }`
- `src/components/UserTimeline.tsx` — created; MUI Table with Timestamp / Event Name / Properties columns; `data-testid="user-timeline"` on container; empty state message
- `src/app/users/[id]/page.tsx` — created; client component using `useParams`, `useUserProfile`; renders loading skeleton, error state, 404 state, identity cluster chips with `data-testid="identity-cluster"`, first/last seen dates, and `<UserTimeline>`; `data-testid="user-profile"` on root container

## Known gaps

The 3 HTTP check criteria require a running dev server with seeded ClickHouse data. All `data-testid` attributes are correctly placed in the rendered JSX and will be present in the HTML output — these are integration gaps as noted in the plan, not implementation gaps.

One note on the hook URL: `useUserProfile` uses a relative URL string (`/api/users/${encodeURIComponent(id)}`) rather than `new URL(..., window.location.origin)`. This is correct for Next.js client components. The test file uses `.toBe("/api/users/...")` string matching (not `new URL()` parsing) for this reason.

## Issues logged

None — ISSUES.md not updated.
