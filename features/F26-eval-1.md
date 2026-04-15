# F26 Eval Sprint 1 — 2026-04-15

## Tests written

- `playwright_tests/user-profile.spec.ts` — covers the 3 HTTP-check criteria from the sprint contract:
  - `data-testid="user-profile"` present in SSR HTML (no ClickHouse needed)
  - 404 / not-found state: identity-cluster not visible
  - identity-cluster + user-timeline present after client-side data load (requires ClickHouse + seed; skips gracefully otherwise)
  - SSR HTML check: confirms `data-testid="user-profile"` in initial page source

## Sprint contract results

| Criterion | Expected | Actual | Pass |
|-----------|----------|--------|------|
| Test suite 0 failures | 0 failures | 0 failures (408 passed, 25 skipped) | ✅ |
| Linter exit 0 | exit 0 | exit 0 (7 pre-existing warnings, 0 errors) | ✅ |
| Type check exit 0 | exit 0 | exit 0 | ✅ |
| Build exit 0 | exit 0 | exit 0 | ✅ |
| `src/components/users/useUserProfile.ts` exists and exports `useUserProfile` | exists | exists | ✅ |
| `src/components/users/__tests__/useUserProfile.test.ts` exists | exists | exists | ✅ |
| `src/components/UserTimeline.tsx` exists and exports `UserTimeline` | exists | exists | ✅ |
| `src/app/users/[id]/page.tsx` exists and contains `"use client"` | exists | exists | ✅ |
| HTTP: `data-testid="user-profile"` in GET /users/test | present | present (in SSR "User not found" branch) | ✅ |
| HTTP: `data-testid="identity-cluster"` in GET /users/test | present | absent | ❌ |
| HTTP: `data-testid="user-timeline"` in GET /users/test | present | absent | ❌ |

## Score: 7/10

## Verdict: NEEDS_WORK

## Feedback for next sprint

| Criterion | Error | File:Line | Action |
|-----------|-------|-----------|--------|
| HTTP: `data-testid="identity-cluster"` in GET /users/test | `curl http://localhost:3000/users/test` returns HTML with only `data-testid="user-profile"`. Neither `identity-cluster` nor `user-timeline` are present because the page is `"use client"` and fetches data in `useEffect`, which never runs during SSR. The initial server render hits the `if (!profile)` branch and outputs "User not found." | `src/app/users/[id]/page.tsx:47-53` | Refactor `src/app/users/[id]/page.tsx` from a fully-client component into a Next.js App Router Server Component: remove `"use client"`, replace `useParams` + `useUserProfile` with `async function UserProfilePage({ params })` that calls `getUserProfile(decodeURIComponent(params.id))` from `@/lib/users` directly (server-side). Extract only the interactive/stateful UI into a separate `"use client"` child component if needed. With server-side fetch, all data-testid attributes will be in the SSR HTML and the HTTP checks will pass. |
| HTTP: `data-testid="user-timeline"` in GET /users/test | Same root cause as above — `UserTimeline` is only rendered in the profile-loaded branch, which is never reached in SSR with the current client-component approach. | `src/app/users/[id]/page.tsx:132` | Same fix as above (server-side data fetch). `UserTimeline` itself has no "use client" and works in a Server Component context. No changes needed to `UserTimeline.tsx`. |

## Notes

- The `useUserProfile` hook and its 8 unit tests are correct and complete. No fixes needed.
- The `UserTimeline` component is correctly implemented and will work once the page is refactored to SSR.
- Duplicate test detected: `useUserProfile.test.ts` has two test cases that both assert `expect(calledUrl).toBe("/api/users/user%40example.com")` — one in the "initial fetch" describe block (line 64) and one in the "URL encoding" describe block (line 133). These pass and are harmless; not blocking.
- Playwright e2e infrastructure exists (`playwright_tests/`, `playwright.config.ts`). The new `playwright_tests/user-profile.spec.ts` is written but cannot run without a live server + ClickHouse. The test gracefully skips if ClickHouse is unavailable.
- The `data-testid="user-profile"` HTTP check passes because that testid appears in all render states (loading, error, 404, profile). The other two testids are conditional on profile being loaded, which never happens during SSR.
