# MiniPanel — Technical Specification

## 1. Overview

MiniPanel is a self-hosted, single-command product analytics platform. It ingests events from external applications, resolves user identities, and lets analysts, growth managers, developers, and support leads explore and visualize behavioral data.

**Guiding constraint:** runs entirely locally — no external services, no API keys, no auth.

---

## 2. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 (App Router) | Already in repo; full-stack with API routes |
| Language | TypeScript | Already in repo |
| UI | MUI v9 + Tailwind CSS v4 | Already in repo |
| Database | ClickHouse via `clickhouse-client` (no Docker) | Columnar storage; sub-second aggregations on millions of events; ideal for analytics |
| ClickHouse client | `@clickhouse/client` | Official Node.js client |
| Charts | Recharts | Composable React charts; works well with MUI |
| Testing (unit) | Vitest | Already in repo |
| Testing (e2e) | Playwright | Already in repo |
| Linting | Biome | Already in repo |

### Starting ClickHouse

The `./clickhouse` binary must be downloaded once (see §10). Run `pnpm dev` — it starts both ClickHouse and Next.js together via `concurrently`. See §10 for details.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (React)                      │
│  /          /explore  /trends  /funnels  /users  /test  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / SSE
┌────────────────────────▼────────────────────────────────┐
│              Next.js App Router (Node.js)                │
│   API Routes          Server Components       Streaming  │
│   /api/events         /api/trends             /api/live  │
│   /api/users          /api/funnels                       │
│   /api/seed           /api/schema                        │
└────────────────────────┬────────────────────────────────┘
                         │ @clickhouse/client
┌────────────────────────▼────────────────────────────────┐
│                     ClickHouse                           │
│   events   identity_mappings   (identity_map_updated)   │
└─────────────────────────────────────────────────────────┘
```

Identity resolution is the only stateful, write-side concern. Everything else is read-only aggregation.

---

## 4. Database Design

### 4.1 `events` table

Stores every raw event exactly as received. Never mutated after insert.

```sql
CREATE TABLE events (
    event_id     UUID           DEFAULT generateUUIDv4(),
    event_name   LowCardinality(String),
    timestamp    DateTime64(3, 'UTC'),
    device_id    Nullable(String),
    user_id      Nullable(String),
    properties   String,        -- JSON blob
    ingested_at  DateTime64(3, 'UTC') DEFAULT now64()
)
ENGINE = MergeTree()
ORDER BY (timestamp, event_id)
PARTITION BY toYYYYMM(timestamp);
```

**Notes:**
- `LowCardinality` on `event_name` compresses well and speeds up group-by queries.
- `properties` is stored as JSON string and parsed at query time using ClickHouse JSON functions (`JSONExtractString`, `JSONExtractFloat`, etc.).
- Partitioned by month to keep pruning fast across large date ranges.

### 4.2 `identity_mappings` table

Maintains the canonical device → user mapping. A device maps to at most one user.

```sql
CREATE TABLE identity_mappings (
    device_id   String,
    user_id     String,
    created_at  DateTime64(3, 'UTC') DEFAULT now64()
)
ENGINE = ReplacingMergeTree(created_at)
ORDER BY (device_id);
```

`ReplacingMergeTree` on `device_id` ensures a device can only map to one user (last write wins, deduplicated at merge time). Queries use `FINAL` to get the deduplicated view.

### 4.3 Resolved identity — query-time join

There is no materialized resolved-identity table. Resolved identity is computed at query time:

```sql
-- Canonical resolved identity for any event
SELECT
    e.*,
    coalesce(e.user_id, m.user_id, e.device_id) AS resolved_id
FROM events e
LEFT JOIN (SELECT device_id, user_id FROM identity_mappings FINAL) m
    ON e.device_id = m.device_id
```

This join is cheap in ClickHouse because `identity_mappings` is small and fits in memory. The dictionary optimization (see §4.4) can be applied if needed at scale.

### 4.4 Optional: ClickHouse Dictionary (performance)

If the identity_mappings table grows large, a `HASHED` dictionary can be defined over it and used in place of the LEFT JOIN:

```sql
CREATE DICTIONARY identity_dict (
    device_id String,
    user_id   String DEFAULT ''
)
PRIMARY KEY device_id
SOURCE(CLICKHOUSE(TABLE identity_mappings))
LAYOUT(HASHED())
LIFETIME(60);
```

This is an optimization, not a day-one requirement.

### 4.5 Numeric property detection

Numeric properties are detected at query time by attempting `JSONExtractFloat`. A `schema` API endpoint pre-scans a sample of recent events to return property names and inferred types, used to populate the UI dropdowns.

---

## 5. Identity Resolution Algorithm

This is the most critical piece of correctness in the system (BR-101).

### Write path (event ingestion)

```
receive event {event_name, timestamp?, device_id?, user_id?, properties?}

1. Validate: at least one of device_id or user_id must be present.
2. If timestamp is missing, set to now().
3. Insert raw event into `events` table.
4. If BOTH device_id AND user_id are present:
   a. Check identity_mappings FINAL for this device_id.
   b. If no mapping exists → INSERT (device_id, user_id).
   c. If mapping exists with same user_id → no-op (idempotent).
   d. If mapping exists with different user_id → reject with 409 Conflict.
      (A device cannot belong to two users.)
```

### Read path (all queries)

Every query that returns events or counts users joins `events` with `identity_mappings FINAL` and uses `coalesce(e.user_id, m.user_id, e.device_id)` as the canonical identity. This means:

- An event sent with only `device_id` will be attributed to the mapped `user_id` once a mapping exists.
- Retroactivity is automatic — ClickHouse reads the current state of `identity_mappings` at query time.

### Invariants

- One device → at most one user. Enforced by `ReplacingMergeTree` + 409 on conflict.
- One user → many devices. Natural: multiple rows with different `device_id` pointing to the same `user_id`.
- Merge is retroactive. No backfill jobs needed.

---

## 6. API Routes

All routes live under `src/app/api/`. All accept/return JSON unless noted.

### 6.1 Event Ingestion

**`POST /api/events`**

Ingests a single event.

Request body:
```json
{
  "event_name": "Purchase Completed",
  "device_id": "device-abc",
  "user_id": "user@example.com",
  "timestamp": "2026-04-15T12:00:00.000Z",
  "properties": {
    "amount": 49.99,
    "currency": "USD",
    "plan": "pro"
  }
}
```

Rules:
- `event_name` required.
- At least one of `device_id` or `user_id` required.
- `timestamp` optional; defaults to server time.
- `properties` optional; any flat key-value object.

Responses:
- `201 Created` — event stored.
- `400 Bad Request` — missing required fields. Body: `{ "error": "..." }`.
- `409 Conflict` — device already mapped to a different user.

**`POST /api/events/batch`**

Ingests an array of events. Same validation per event. Returns `{ ok: number, errors: Array<{index, error}> }`.

### 6.2 Event Explorer

**`GET /api/events/list`**

Query params:
- `event_name` (optional) — filter by name
- `resolved_id` (optional) — filter by resolved identity
- `before` (optional) — ISO timestamp cursor for pagination
- `limit` (optional, default 50, max 200)

Returns events in reverse chronological order, with `resolved_id` computed. Cursor-based pagination avoids offset slowness on large tables.

Response:
```json
{
  "events": [...],
  "next_cursor": "2026-04-14T11:59:59.000Z"
}
```

### 6.3 Schema / Autocomplete

**`GET /api/schema`**

Returns distinct event names and, per event, the detected property names with types.

Response:
```json
{
  "event_names": ["Page Viewed", "Purchase Completed"],
  "properties": {
    "Purchase Completed": {
      "amount": "numeric",
      "currency": "string",
      "plan": "string"
    }
  }
}
```

Computed by sampling the last 10,000 events. Cached in memory for 60 seconds.

### 6.4 Trends

**`GET /api/trends`**

Query params:
- `event_name` (required)
- `measure` — `count` | `unique_users` | `sum:<property>` | `avg:<property>` | `min:<property>` | `max:<property>`
- `granularity` — `day` | `week`
- `start` — ISO date
- `end` — ISO date
- `breakdown` (optional) — property name to break down by
- `breakdown_limit` (optional, default 10) — top N values; rest grouped as "Other"

Response:
```json
{
  "series": [
    {
      "label": "US",
      "data": [
        { "date": "2026-04-01", "value": 142 },
        ...
      ]
    }
  ]
}
```

### 6.5 Funnels

**`POST /api/funnels`**

Body:
```json
{
  "steps": ["Page Viewed", "Signup Completed", "Purchase Completed"],
  "start": "2026-03-15",
  "end": "2026-04-15"
}
```

Returns per-step counts and conversion rates. Uses resolved identities. Respects event timestamp ordering within the window.

Response:
```json
{
  "steps": [
    { "name": "Page Viewed",       "users": 1000, "conversion_from_prev": null,  "conversion_overall": 1.0 },
    { "name": "Signup Completed",  "users": 320,  "conversion_from_prev": 0.32,  "conversion_overall": 0.32 },
    { "name": "Purchase Completed","users": 88,   "conversion_from_prev": 0.275, "conversion_overall": 0.088 }
  ]
}
```

Funnel SQL uses a window function approach: for each resolved user, find the earliest timestamp for each step in order within the date range.

### 6.6 User Profiles

**`GET /api/users`**

Query params: `q` (search string), `limit`, `cursor`.

**`GET /api/users/[id]`**

Returns:
```json
{
  "resolved_id": "user@example.com",
  "first_seen": "...",
  "last_seen": "...",
  "identity_cluster": {
    "user_ids": ["user@example.com"],
    "device_ids": ["device-abc", "device-xyz"]
  },
  "events": [...]
}
```

### 6.7 Seed Data

**`POST /api/seed`**

Clears existing data and populates ClickHouse with realistic sample data (BR-102). Idempotent. Should complete in < 30 seconds.

Sample data spec:
- 6 event types: `Page Viewed`, `Button Clicked`, `Signup Completed`, `Purchase Completed`, `Subscription Renewed`, `Support Ticket Opened`
- 70 users (50 fully resolved, 10 multi-device, 10 anonymous-only)
- ~12,000 events over 30 days
- Non-uniform distribution: power-law on user activity; `Page Viewed` ~40% of events
- String properties: `page`, `button_name`, `plan`, `currency`, `source`
- Numeric properties: `amount` (0–500), `duration_seconds` (0–3600), `ticket_count`

**`GET /api/seed/status`**

Returns current event count and user count — useful for verifying seed completed.

### 6.8 Live Event Feed (SSE)

**`GET /api/live`**

Server-Sent Events stream. Polls ClickHouse every 1 second for events with `ingested_at > last_seen` and pushes them to the client. Used by the Testing page.

Response is a stream of `text/event-stream` messages:
```
data: {"event_id":"...","event_name":"Page Viewed","resolved_id":"device-abc","timestamp":"...","properties":{...}}

data: {"event_id":"...","event_name":"Purchase Completed","resolved_id":"user@x.com","timestamp":"...","properties":{...}}
```

---

## 7. Frontend Pages

All pages are React Server Components (RSC) where possible, falling back to Client Components only for interactive elements. Navigation via MUI sidebar.

### 7.1 Navigation Shell (`/`)

Persistent left sidebar with links:
- Explore
- Trends
- Funnels
- Users
- **Test** (for developers)
- **Generate** (bulk event generation)

Dashboard home (`/`) shows headline metrics: total events, total users, most common event in the last 7 days.

### 7.2 Event Explorer (`/explore`)

- Table of events, newest first
- Columns: Timestamp, Event Name, Resolved Identity, Properties (collapsed JSON chip, expandable)
- Filter bar: event name dropdown (populated from `/api/schema`)
- Virtual scroll / infinite scroll using cursor pagination
- Clicking a resolved identity navigates to `/users/[id]`

### 7.3 Trends / Insights (`/trends`)

Controls panel:
- Event name selector (autocomplete from schema)
- Measure selector: Count / Unique Users / Sum of / Avg of / Min of / Max of [property]
  - Property dropdown appears only for aggregation measures; restricted to numeric properties
- Granularity toggle: Day / Week
- Date range: preset chips (Last 7d, Last 30d, Last 90d) + custom date picker
- Breakdown selector (optional): property dropdown + limit

Chart panel:
- Recharts `LineChart` by default
- Chart type switcher (BR-301): Line / Bar / Area / Table
- Sensible defaults: Line for time series; when only one date bucket, auto-switch to Bar

### 7.4 Funnels (`/funnels`)

- Step builder: ordered list of event name selectors (2–5 steps, add/remove buttons)
- Date range selector (same presets as Trends)
- Result: horizontal funnel bar chart showing user count per step, with conversion % annotations
- Drop-off percentage highlighted in red between steps

### 7.5 User Profiles (`/users`)

- Search input → calls `/api/users?q=...`
- Results list → click opens `/users/[id]`
- Profile page shows:
  - Identity cluster (user IDs + device IDs as chips)
  - First seen / Last seen
  - Event timeline: reverse chronological, same format as Explorer

### 7.6 Testing Page (`/test`)

Purpose: lets developers verify event ingestion and identity resolution without writing curl commands (BR-200, BR-101 verification).

#### Layout

Two-panel layout:
- **Left panel — Event Sender**: controls to fire events
- **Right panel — Live Feed**: real-time stream of incoming events

### 7.7 Bulk Generator Page (`/generate`)

Purpose: lets developers and analysts populate ClickHouse with large volumes of synthetic events to stress-test queries, verify chart performance, and simulate realistic scale — up to 1,000,000 events.

#### Layout

Single-page form with a progress panel that appears once generation starts.

#### Configuration Form

| Field | Type | Default | Notes |
|---|---|---|---|
| Total events | Number input | 10,000 | Min 1, max 1,000,000 |
| Number of users | Number input | 100 | Synthetic user pool size |
| Date range | Date range picker | Last 30 days | Events distributed across this window |
| Event mix | Checkboxes + weight sliders | Preset mix | Select which event types to include and their relative frequency |
| Identity resolution | Toggle | On | When on, a configurable % of users start anonymous and later identify |
| Anonymous ratio | Slider (0–100%) | 30% | % of users who have an anonymous phase |
| Numeric property variance | Slider | Medium | Controls spread of `amount`, `duration_seconds`, etc. |

**Preset templates** (one-click populate the form):
- "Realistic (10k events, 30 days)" — mirrors seed data shape
- "High volume (100k events, 90 days)"
- "Stress test (1M events, 365 days)"

#### Generation Strategy

Generating 1M events synchronously in a single request would time out. The generation runs as a **streaming job** on the server:

1. Client posts config to `POST /api/generate/start` → receives a `job_id`.
2. Client subscribes to `GET /api/generate/[job_id]/status` (SSE) to receive progress.
3. Server inserts events in batches of **10,000 rows** using ClickHouse's native protocol bulk insert (`INSERT INTO events FORMAT JSONEachRow`). ClickHouse can sustain ~100k–500k rows/sec on local hardware.
4. Identity mappings are inserted in a separate batch after event insertion.
5. Job completes when all batches are done. Total time for 1M events: typically 5–15 seconds on modern hardware.

#### Progress Panel (shown during/after generation)

- Progress bar: "X / 1,000,000 events inserted (Y%)"
- Estimated time remaining (derived from current throughput)
- Throughput meter: "~142,000 events/sec"
- Status: Queued / Running / Complete / Failed
- On complete: links to `/explore` and `/trends` to immediately explore generated data
- Cancel button: sends `POST /api/generate/[job_id]/cancel` — stops after the current batch

#### API Routes for Bulk Generation

**`POST /api/generate/start`**

Body: generation config (see form fields above). Returns `{ job_id: string }`.

**`GET /api/generate/[job_id]/status`** (SSE)

Streams progress events:
```
data: {"status":"running","inserted":50000,"total":1000000,"throughput":125000,"eta_seconds":7}
data: {"status":"running","inserted":150000,"total":1000000,"throughput":148000,"eta_seconds":6}
data: {"status":"complete","inserted":1000000,"total":1000000,"elapsed_ms":8200}
```

**`POST /api/generate/[job_id]/cancel`**

Sets a cancellation flag checked between batches. Returns `{ cancelled: true }`.

**`GET /api/generate/jobs`**

Lists recent generation jobs with status and row counts. Useful to see if a previous run is still in progress.

#### Implementation Notes

- Generation runs in a Node.js `async` loop (no worker threads needed; ClickHouse inserts are async I/O).
- Job state is stored in an in-memory `Map<job_id, JobState>` (sufficient for single-machine use; no Redis needed).
- Each batch generates random events using a seeded pseudo-random number generator (`mulberry32`) so distributions are reproducible given the same seed.
- The generator reuses the same identity resolution logic as the seed script (`src/lib/identity.ts`), ensuring correctness.

#### Left Panel — Event Sender

**Quick-fire buttons** (pre-configured payloads, one click to send):

| Button | Event Name | Payload |
|---|---|---|
| Anonymous Page View | `Page Viewed` | random device_id, `{ page: "/home" }` |
| Button Click | `Button Clicked` | same device_id as last anonymous, `{ button_name: "Get Started" }` |
| Identify User | _(identity link)_ | same device_id + `user_id: "test@example.com"` |
| Purchase | `Purchase Completed` | `user_id: "test@example.com"`, `{ amount: 49.99, currency: "USD" }` |
| Signup | `Signup Completed` | new random device_id, new random user_id |
| Custom Event | _(form)_ | manual fields |

**Custom Event Form** (collapsible):
- `event_name` text input
- `device_id` text input (optional)
- `user_id` text input (optional)
- `timestamp` datetime input (optional)
- `properties` JSON textarea with syntax highlighting (CodeMirror or simple `<textarea>`)
- Submit button

After each send, show inline success/error toast under the button.

**Seed Data button**: calls `POST /api/seed` with a loading indicator. Shows event count after completion.

#### Right Panel — Live Feed

- Connects to `GET /api/live` (SSE)
- Displays newest events at top (prepend, not append)
- Each event card shows:
  - Timestamp (relative: "2s ago")
  - Event name (colored chip by event type)
  - Resolved identity (device or user)
  - Properties (compact JSON)
- Max 200 events shown; older ones are discarded
- Connection status indicator: green dot "Live" / red dot "Disconnected"
- Clear button
- Pause/Resume toggle (pauses rendering, buffers in background)

---

## 8. Component Structure

```
src/
├── app/
│   ├── layout.tsx              # MUI theme provider, sidebar shell
│   ├── page.tsx                # Dashboard home
│   ├── explore/
│   │   └── page.tsx
│   ├── trends/
│   │   └── page.tsx
│   ├── funnels/
│   │   └── page.tsx
│   ├── users/
│   │   ├── page.tsx            # Search
│   │   └── [id]/
│   │       └── page.tsx        # Profile
│   ├── test/
│   │   └── page.tsx            # Testing page
│   ├── generate/
│   │   └── page.tsx            # Bulk generator page
│   └── api/
│       ├── events/
│       │   ├── route.ts        # POST /api/events
│       │   ├── batch/route.ts
│       │   └── list/route.ts
│       ├── schema/route.ts
│       ├── trends/route.ts
│       ├── funnels/route.ts
│       ├── users/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── seed/
│       │   ├── route.ts
│       │   └── status/route.ts
│       ├── live/route.ts       # SSE stream
│       └── generate/
│           ├── start/route.ts
│           ├── jobs/route.ts
│           └── [job_id]/
│               ├── status/route.ts   # SSE progress stream
│               └── cancel/route.ts
├── lib/
│   ├── clickhouse.ts           # ClickHouse client singleton
│   ├── identity.ts             # Identity resolution logic
│   ├── seed.ts                 # Sample data generation
│   └── schema-cache.ts         # In-memory schema cache
└── components/
    ├── Sidebar.tsx
    ├── EventTable.tsx
    ├── TrendChart.tsx
    ├── FunnelChart.tsx
    ├── UserTimeline.tsx
    ├── test/
    │   ├── QuickFireButtons.tsx
    │   ├── CustomEventForm.tsx
    │   └── LiveFeed.tsx
    ├── generate/
    │   ├── GeneratorForm.tsx
    │   ├── ProgressPanel.tsx
    │   └── JobList.tsx
    └── ui/
        ├── JsonChip.tsx
        └── IdentityChip.tsx
```

---

## 9. ClickHouse Client Setup

`src/lib/clickhouse.ts` exports a singleton client:

```typescript
import { createClient } from '@clickhouse/client';

export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DB ?? 'minipanel',
  password: process.env.CLICKHOUSE_PASSWORD ?? 'password',
});
```

Environment variables (`.env.local`, not committed):
```
CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_DB=minipanel
CLICKHOUSE_PASSWORD=password
```

A migration script (`scripts/migrate.ts`) runs on startup and is idempotent (`CREATE TABLE IF NOT EXISTS`).

---

## 10. Local ClickHouse Setup

No Docker required. Download the ClickHouse single binary into the project root once:

```bash
curl https://clickhouse.com/ | sh
```

This places `./clickhouse` (v26+) in the current directory. The binary is gitignored.

### Running a local server

```bash
./clickhouse server -- --path=.clickhouse
# HTTP:   localhost:8123
# Data:   .clickhouse/
```

Stopping:
```bash
kill $(cat .clickhouse/status)
```

The `.clickhouse/` directory is already in the repo with its own `.gitignore` that ignores all generated data.

### Integrated dev script

`package.json`:
```json
{
  "scripts": {
    "dev": "concurrently -n CH,NEXT -c cyan,green \"./clickhouse server -- --path=.clickhouse\" \"next dev\""
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

`concurrently` forwards Ctrl+C to both processes.

### Running queries / debugging

```bash
./clickhouse client --query "SHOW DATABASES"
./clickhouse client --query "SELECT count() FROM minipanel.events"
```

### Database initialization

A `scripts/migrate.ts` script (run via `tsx`) creates the database and tables:

```bash
pnpm migrate   # "tsx scripts/migrate.ts"
```

It shells out to `./clickhouse client --queries-file scripts/schema.sql`. The `predev` npm hook runs it automatically so first-time setup is still one command:

```json
"predev": "tsx scripts/migrate.ts"
```

`migrate.ts` uses `CREATE DATABASE IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` — fully idempotent.

### Reset

```bash
kill $(cat .clickhouse/status)
rm -rf .clickhouse/data/ .clickhouse/metadata/ .clickhouse/status
./clickhouse server -- --path=.clickhouse
pnpm migrate
```

---

## 11. Testing Strategy

### Unit tests (Vitest)

**`src/lib/identity.test.ts`** — verifies BR-101 (required by hard constraints):

1. Anonymous event followed by identify event → all prior events attributed to user.
2. Two devices linked to same user → both device's events appear in user query.
3. Device mapped to two users → second mapping returns 409.
4. Identify event is idempotent (same device + same user sent twice → no error).

These tests run against a real ClickHouse instance (test database `minipanel_test`), not mocks. The test suite creates and tears down the schema before/after each test file.

### Integration tests (Playwright)

**`playwright_tests/`** — end-to-end flows:

1. `test-page.spec.ts`: fire a quick-fire event via Testing page, verify it appears in Live Feed within 3 seconds.
2. `explore.spec.ts`: seed data, open Explorer, filter by event name, verify results.
3. `trends.spec.ts`: seed data, open Trends, select event + measure, verify chart renders with data.
4. `funnels.spec.ts`: build a 3-step funnel, verify conversion rates are non-zero.
5. `identity.spec.ts`: simulate anonymous → identify flow via Testing page, look up user profile, verify merged timeline.

### Manual verification scenarios

Matching BR verification steps:
- **BR-101 Scenario 1**: Use Testing page → fire "Anonymous Page View" 4× → fire "Identify User" → open `/users/test@example.com` → verify 5 events.
- **BR-101 Scenario 2**: Use Custom Event Form to link two devices to same user → verify both sets of events in profile.

---

## 12. Feature → BR Mapping

| Feature | BRs Covered |
|---|---|
| `POST /api/events` | BR-100 |
| Identity resolution logic | BR-101 |
| Seed data script | BR-102 |
| docker-compose + README | BR-103 |
| Event Explorer page | BR-200 |
| Trends page (count/unique) | BR-201 |
| Trends page (numeric aggregations) | BR-300 |
| Chart type switcher | BR-301 |
| Breakdown selector | BR-302 |
| Funnels page | BR-303 |
| User Profiles page | BR-304 |
| MUI theming, empty states, loading | BR-305 |
| Testing page + Live Feed | Developer UX (unlisted) |
| Bulk Generator page | Developer / load-testing UX (unlisted) |

Nice-to-have (Tier 4) not in initial scope: BR-400 (saved analyses), BR-401 (autocomplete — partially covered by schema API), BR-402 (multi-event chart).

---

## 13. Open Questions / Decisions Deferred

1. **SSE backpressure**: if events arrive faster than the client can consume them, should the server buffer or drop? Initial impl: drop (newest only).
2. **Funnel window**: should there be a per-user time window within which all steps must occur (e.g., steps must happen within 7 days of step 1)? Not in BRs; defer.
3. **ClickHouse auth**: password is `password`, set via `CLICKHOUSE_PASSWORD` env var (defaults to `"password"` in `clickhouse.ts`).
4. **JSON property depth**: flat key-value only for now. Nested JSON properties are stored but not queryable without explicit path syntax.
5. **Concurrency on identity mapping**: `ReplacingMergeTree` deduplicate asynchronously; `FINAL` queries force deduplication at read time. This is slightly slower but correct. If write throughput becomes an issue, switch to a dedicated `AggregatingMergeTree` pattern.
