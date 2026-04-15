# F12 Plan

## Acceptance criteria

From SPEC.md §6.5 — POST /api/funnels:

- POST /api/funnels accepts a JSON body with `steps` (array of event names), `start` (ISO date), `end` (ISO date).
- Returns per-step counts and conversion rates using resolved identities.
- Respects event timestamp ordering within the window.
- Response shape:
  ```json
  {
    "steps": [
      { "name": "Page Viewed",       "users": 1000, "conversion_from_prev": null,  "conversion_overall": 1.0 },
      { "name": "Signup Completed",  "users": 320,  "conversion_from_prev": 0.32,  "conversion_overall": 0.32 },
      { "name": "Purchase Completed","users": 88,   "conversion_from_prev": 0.275, "conversion_overall": 0.088 }
    ]
  }
  ```
- Funnel SQL uses a window function approach: for each resolved user, find the earliest timestamp for each step in order within the date range.

From SPEC.md §7.4 — Funnels page (relevant to API contract):
- Step builder supports 2–5 steps.

## Dependencies

Completed features this builds on: F1 (ClickHouse client), F2 (migration/schema), F4 (identity resolution), F5 (event ingestion — for test data).

Exact file paths that will be imported or extended:
- `src/lib/clickhouse.ts` — ClickHouse client singleton (imported by new funnel lib)
- `src/lib/identity.ts` — `EventRow` type, resolved identity join pattern (referenced for SQL pattern)

## Files to create or modify

- CREATE `src/lib/funnels.ts` — funnel query builder and executor
- CREATE `src/app/api/funnels/route.ts` — POST route handler
- CREATE `src/lib/__tests__/funnels.test.ts` — unit tests for funnel query logic
- CREATE `src/app/api/funnels/__tests__/route.test.ts` — unit tests for route handler

## Implementation order

1. **Create `src/lib/funnels.ts`** — Define types (`FunnelParams`, `FunnelStepResult`, `FunnelResponse`), implement `buildFunnelQuery(params)` that constructs a ClickHouse query using `windowFunnel()` aggregate function with parameterized step conditions and resolved identity JOIN, and implement `queryFunnel(params, client?)` that executes the query and transforms raw level counts into per-step user counts with `conversion_from_prev` and `conversion_overall` rates.

2. **Create `src/lib/__tests__/funnels.test.ts`** — Unit tests for `buildFunnelQuery` (SQL structure, parameterization, step count variation) and `queryFunnel` (result transformation, conversion rate math, empty results, edge cases).

3. **Create `src/app/api/funnels/route.ts`** — POST handler that parses JSON body, validates `steps` (array of 2–5 non-empty strings), `start` and `end` (required), calls `queryFunnel`, and returns the response. Returns 400 for validation errors, 500 for query errors.

4. **Create `src/app/api/funnels/__tests__/route.test.ts`** — Unit tests for the POST handler: validation errors (missing steps, too few/many steps, missing dates), successful response forwarding, error handling.

## Sprint contract

- [ ] `pnpm test` → 0 failures
- [ ] `pnpm lint` → exit 0
- [ ] `pnpm typecheck` → exit 0
- [ ] `pnpm build` → exit 0
- [ ] File `src/lib/funnels.ts` exists and exports `buildFunnelQuery`, `queryFunnel`, `FunnelParams`, `FunnelResponse`
- [ ] File `src/app/api/funnels/route.ts` exists and exports `POST`
- [ ] File `src/lib/__tests__/funnels.test.ts` exists and contains test cases
- [ ] File `src/app/api/funnels/__tests__/route.test.ts` exists and contains test cases

## Test plan

### `src/lib/__tests__/funnels.test.ts`

- **Module under test**: `buildFunnelQuery`, `queryFunnel` from `@/lib/funnels`
- **Cases to cover**:

  **buildFunnelQuery:**
  - Generates SQL containing `windowFunnel` aggregate function
  - Includes `identity_mappings FINAL` JOIN for resolved identity
  - Generates one step condition parameter per step (e.g., `{step_0:String}`, `{step_1:String}`)
  - Correctly populates `query_params` with step names, start, and end_exclusive
  - Works with 2 steps (minimum)
  - Works with 5 steps (maximum)
  - Start param uses ClickHouse-compatible space-separated format (no T or Z)
  - End exclusive is computed correctly (day after end date)
  - Filters events by date range in WHERE clause (`{start:String}`, `{end_exclusive:String}`)
  - Groups by resolved identity (`coalesce(e.user_id, m.user_id, e.device_id)`)

  **queryFunnel (mocked ClickHouse):**
  - Returns correct step names in order from params
  - Computes cumulative user counts (level >= N for step N)
  - `conversion_from_prev` is `null` for step 1
  - `conversion_from_prev` is computed correctly for subsequent steps (step N users / step N-1 users)
  - `conversion_overall` for step 1 is `1.0`
  - `conversion_overall` is computed correctly (step N users / step 1 users)
  - Returns `{ steps: [] }` when no rows are returned (empty funnel)
  - Handles a step with 0 users mid-funnel (conversion_from_prev = 0, avoids division by zero)
  - Coerces string values from ClickHouse to numbers

### `src/app/api/funnels/__tests__/route.test.ts`

- **Module under test**: `POST` from `@/app/api/funnels/route`
- **Cases to cover**:

  **Validation — 400 responses:**
  - Returns 400 when body is not valid JSON
  - Returns 400 when `steps` is missing
  - Returns 400 when `steps` has fewer than 2 entries
  - Returns 400 when `steps` has more than 5 entries
  - Returns 400 when `steps` contains non-string entries
  - Returns 400 when `start` is missing
  - Returns 400 when `end` is missing

  **Success — 200 response:**
  - Returns 200 with `steps` array in response body
  - Forwards parsed params correctly to `queryFunnel`

  **Error handling — 500 response:**
  - Returns 500 when `queryFunnel` throws

- **Integration gap**: POST `http://localhost:3000/api/funnels` HTTP response with seeded data — requires dev server and ClickHouse

## Risks and open questions

- **`windowFunnel` parameter binding**: The step conditions inside `windowFunnel()` are built dynamically (one per step). Parameterized placeholders like `e.event_name = {step_0:String}` should work inside `windowFunnel` conditions, but this must be verified against ClickHouse. If parameter binding fails inside aggregate function conditions, fall back to escaped string literals with strict validation (alphanumeric + spaces only).
- **`windowFunnel` window size**: The spec defers per-user time windows (§13.2). Using a large constant (e.g., `2147483647` seconds ≈ 68 years) effectively means "no time constraint between steps" — only ordering matters. This aligns with the spec's current requirements.
- **Conversion rate precision**: The spec shows 3 decimal places in examples (e.g., `0.275`). Implementation should return raw floating point — formatting is a frontend concern.
