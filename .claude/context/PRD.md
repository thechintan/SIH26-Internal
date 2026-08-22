# Product Requirements Document
## Civic Issue Reporting & Prioritization Platform

**Version:** 2.0
**Platform:** Single mobile-responsive web application (PWA)
**Status:** Draft for team review
**Team size:** 4 — all workstreams independently executable

---

## 1. Problem Statement

Municipal bodies have no reliable pipeline for discovering, prioritizing, and closing everyday civic issues — potholes, broken streetlights, overflowing bins, damaged footpaths. Citizens see these problems daily but have no low-friction way to report them, and when they do, reports vanish into an untracked queue.

The gap is not just "collect reports." Three harder problems sit underneath:

1. **Signal, not noise.** Fifty citizens photographing the same pothole should produce *one* actionable ticket, not fifty rows.
2. **Ranking under scarcity.** A municipality can fix maybe 30 things this week out of 3,000 open reports. Which 30?
3. **Accountability loop.** A citizen who reports something and hears nothing never reports again. Status visibility is what sustains the data supply.

---

## 2. Platform Decision — Responsive Web (PWA)

One codebase, three surfaces, all responsive:

| Surface | Route prefix | Primary device |
|---|---|---|
| Citizen reporting | `/` | Mobile browser |
| Admin dashboard | `/admin` | Desktop browser |
| Field staff | `/field` | Mobile browser |

**Why this is the right call for a hackathon:** no app-store friction, one deploy, judges open a URL on their own phone, and the same components serve all three surfaces.

### Honest constraints of web vs. native — plan around these, don't discover them at 3 AM

| Constraint | Impact | Mitigation |
|---|---|---|
| **GPS accuracy is worse in browser** than native — often ±20–50m in cities | Clustering radius must be more tolerant | `getCurrentPosition` returns an `accuracy` field. Capture it, feed it into the adaptive radius (§5). Also let the user drag the pin. |
| **iOS Safari push notifications** require the PWA to be installed to home screen (iOS 16.4+) | Push may silently not work on judge's iPhone | **Do not make push the only notification channel.** In-app status timeline is the primary channel; push is enhancement. Have SMS/email as fallback if time permits. |
| **No true background upload** — if the tab closes mid-upload, it dies | Lost reports on flaky connections | Upload directly to object storage via presigned URL, show a real progress bar, keep the user on-screen until it completes |
| **Camera access requires HTTPS** | `localhost` works, raw IP does not | Deploy to Vercel from day 1; test on real phones over HTTPS, not just desktop devtools |
| **iOS Safari file input quirks** with `capture` attribute | Camera may open gallery instead | Use `<input type="file" accept="image/*" capture="environment">` and test early on a real iPhone |

**Rule:** every citizen-facing feature must be tested on a real phone browser, not Chrome's device emulator. Emulator lies about camera, GPS, and viewport height.

---

## 3. Tech Stack

### Core (locked — nobody deviates)

| Layer | Choice | Reasoning |
|---|---|---|
| **Framework** | Next.js 14+ (App Router) + TypeScript | One repo serves citizen UI, admin UI, and API routes. Server components keep the admin dashboard fast. |
| **Styling** | Tailwind CSS + shadcn/ui | Responsive utilities are the whole point here; shadcn gives you tables, dialogs, and forms without design time |
| **Database** | Supabase (Postgres + **PostGIS**) | PostGIS is non-negotiable — clustering needs real geospatial queries. Supabase gives Postgres, auth, storage, and realtime in one service. |
| **Storage** | Supabase Storage | Presigned upload URLs, no separate S3 setup |
| **Auth** | Supabase Auth (email + password for everyone — decisions/005 dropped phone OTP) | Row Level Security ties directly to auth — use it |
| **Realtime** | Supabase Realtime | Live dashboard updates without hand-rolling WebSockets |
| **Maps** | Leaflet + OpenStreetMap tiles | Free, no API key, no billing surprises mid-demo. React wrapper: `react-leaflet` |
| **Charts** | Recharts | Analytics with minimal ceremony |
| **Scheduled jobs** | Vercel Cron → API route | Priority rescoring every 5 min |
| **Deploy** | Vercel | HTTPS from day 1, preview deploys per branch |

**One language across the whole stack (TypeScript).** Resist splitting a Python service out for the intelligence layer — cross-language integration is exactly the kind of overhead a 4-person hackathon team can't absorb. If you build the stretch image classifier, call a hosted vision model API rather than standing up a second runtime.

### Supporting tools
- **Mocking:** MSW (Mock Service Worker) — this is what makes independent work possible
- **Validation:** Zod, shared between client and API routes
- **State/fetching:** TanStack Query
- **Seed data:** Faker + a script that generates realistic clustered coordinates

---

## 4. Core Concepts (shared vocabulary — everyone uses these exact terms)

| Term | Meaning |
|---|---|
| **Report** | A single citizen submission: one photo, one category, one location, one timestamp, optional text |
| **Incident** | A real-world problem. One incident aggregates *N* reports of the same category at the same place |
| **Report count** | Number of **unique users** who reported an incident (not raw rows — spam protection) |
| **Priority score** | A numeric ranking of an incident, recomputed periodically |
| **Department** | Sanitation, Public Works, Electrical, Water & Drainage |
| **Status** | `SUBMITTED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED` (plus `REJECTED`, `DUPLICATE`) |

**Critical design rule:** Citizens create *reports*. Admins act on *incidents*. Never let the admin dashboard show raw reports as the primary work unit.

---

## 5. Data Model

### `reports`
```sql
id                  uuid primary key
user_id             uuid references users
incident_id         uuid references incidents  -- null until clustered
category            category_enum
photo_url           text
location            geography(Point, 4326)     -- PostGIS type, not two floats
gps_accuracy_m      float                      -- drives adaptive clustering radius
description         text
severity_self       severity_enum              -- citizen's own read
created_at          timestamptz
device_fingerprint  text                       -- rate limiting
predicted_category  category_enum              -- stretch: from image model
flagged_mismatch    boolean default false
```

### `incidents`
```sql
id                    uuid primary key
category              category_enum
centroid              geography(Point, 4326)
report_count          int                      -- unique users
first_reported_at     timestamptz
status                status_enum
department_id         uuid references departments
assigned_to           uuid references users
priority_score        float                    -- INDEXED — ORDER BY target
priority_breakdown    jsonb                    -- explains the score to admins
manual_override       boolean default false    -- auto-scorer skips these
previous_incident_id  uuid references incidents -- recurrence chain
ward_id               uuid references wards
resolved_at           timestamptz
resolution_photo_url  text
```

### Supporting
`users`, `departments`, `wards` (with polygon geometry), `category_severity` (configurable, **not** hardcoded), `status_history` (audit trail), `incident_reporters` (join table enforcing unique-user counting)

### Required indexes
```sql
CREATE INDEX ON incidents USING GIST (centroid);
CREATE INDEX ON reports USING GIST (location);
CREATE INDEX ON incidents (priority_score DESC) WHERE status != 'RESOLVED';
```
That third one is what keeps the admin queue instant at 100k rows.

---

## 6. Clustering Engine

### Algorithm (runs on every new report)
```
1. r = incoming report
2. R = 35 + r.gps_accuracy_m          -- adaptive radius, metres
3. Query: open incidents WHERE category = r.category
          AND ST_DWithin(centroid, r.location, R)
          ORDER BY ST_Distance(centroid, r.location) LIMIT 1
4. If match:
     - r.incident_id = match.id
     - INSERT into incident_reporters (ignore if user already present)
     - report_count = count(distinct user) from incident_reporters
     - recompute centroid as mean of member report locations
5. Else:
     - create new incident seeded from r
6. Enqueue incident for rescoring
```

### Rules
- **Never cluster across categories.** A pothole and a broken streetlight at one corner are two incidents — correct, not a bug.
- **Never cluster into a `RESOLVED` incident.** Create a new one, set `previous_incident_id`. A location with 3+ chained incidents is a recurring-failure signal worth surfacing.
- **Adaptive radius.** Browser GPS is materially worse than native — using the device-reported accuracy prevents obvious duplicates from being missed in dense areas.

### Known limitations (document, don't solve in MVP)
- **Elongated issues:** a 60m stretch of broken road may fragment into 2–3 incidents. Mitigation: an admin **Merge Incidents** action. Far cheaper than road-network-aware clustering.
- **User picks wrong category:** the stretch image classifier cross-checks; on high-confidence disagreement set `flagged_mismatch` and surface for admin review rather than silently overriding.

---

## 7. Priority Engine

### Formula

$$P = w_1 \cdot S_{cat} + w_2 \cdot \ln(1 + N_{users}) + w_3 \cdot D_{open} + w_4 \cdot B_{recur}$$

- $S_{cat}$ — category severity, from the configurable `category_severity` table
- $N_{users}$ — unique-user report count
- $D_{open}$ — days since `first_reported_at`
- $B_{recur}$ — recurrence bonus (0 if new location, 2 if `previous_incident_id` exists)

**Starting weights:** $w_1 = 1.0$, $w_2 = 2.0$, $w_3 = 0.5$, $w_4 = 1.0$ — tune once real data exists.

### Why each term is shaped this way

**Logarithm on report count.** With a raw count, one viral issue with 500 reports permanently dominates the queue and starves everything else. $\ln$ compresses this: 1→10 reports moves the score meaningfully, 100→500 barely does.

**Aging term.** Without $D_{open}$, low-severity categories never surface. A minor issue open 30 days should eventually rise. This prevents queue starvation.

**Severity as config, not code.** Different municipalities weight differently. Ship a default table, make it editable in admin settings.

### Default severity table (v1)
| Category | $S_{cat}$ |
|---|---|
| Bridge / structural damage | 10 |
| Exposed electrical wiring | 9 |
| Open manhole / drain collapse | 9 |
| Water pipeline leak | 7 |
| Large pothole | 6 |
| Damaged footpath | 4 |
| Garbage overflow | 3 |
| Streetlight not working | 2 |

### Worked example
Pothole (S=6), 12 unique reporters, open 3 days, not recurring:

$$P = 1(6) + 2\ln(13) + 0.5(3) + 0 = 6 + 5.13 + 1.5 = 12.63$$

Streetlight (S=2), 1 reporter, open 1 day:

$$P = 1(2) + 2\ln(2) + 0.5(1) + 0 = 2 + 1.39 + 0.5 = 3.89$$

Ordering is sensible: severity plus corroboration wins, but the single low-severity report isn't lost — it ranks lower until more people confirm it or it ages up.

### Performance rule
**Never compute $P$ on page load.** A Vercel Cron job every 5 minutes writes `priority_score` and `priority_breakdown`. The dashboard reads `ORDER BY priority_score DESC LIMIT 100` against the partial index.

### Edge cases the engine must respect
1. **Manual override sticks.** Admin bumps priority → `manual_override = true` → auto-scorer skips that row until cleared.
2. **Unique users only.** `report_count` comes from `incident_reporters`, blocking naive inflation.
3. **Rate limiting.** Max 10 reports/user/hour at the API layer.
4. **Equity normalization (stretch — but say it in the pitch either way).** Volume-driven ranking systematically favors dense, high-smartphone-penetration, high-engagement areas. A genuinely worse problem in a low-report-density ward can sit below a minor issue in a busy one. Mitigation: normalize $N_{users}$ against that ward's historical mean, so the system reads "unusual *for this area*" rather than an absolute count. Raising this even unimplemented signals design maturity.

---

## 8. Routing Engine

**Layer 1 (MVP, deterministic):** `category → department` lookup table. Reliable, debuggable, demoable.

**Layer 2 (stretch):** For ambiguous inputs ("tree fell on power line" — Public Works or Electrical?), an LLM reads description + category and proposes a department plus a one-line brief. Always advisory; admin can reassign.

---

## 9. User Flow — Citizen (mobile web)

### 9.1 Entry
```
Landing page (/) — works logged out
  → Hero: "Report a civic issue in 45 seconds"
  → Live counter: "1,284 issues reported · 891 resolved"
  → [Report an Issue]  ← primary CTA
  → Public map preview of nearby open incidents
```
**Design note:** let people see the map and browse *before* signing in. Forcing OTP at the door kills conversion, and judges will bounce off it too.

### 9.2 Auth (deferred as long as possible)
Sign-in is triggered at *submit* time, not at app open:
```
Phone number → OTP → session
```
Draft report state is held client-side and submitted immediately after auth completes, so nothing is lost.

### 9.3 Report submission — the critical path
```
[STEP 1] Photo
  <input type="file" accept="image/*" capture="environment">
  - Opens rear camera on mobile
  - Client-side compression (browser-image-compression) → target ≤500KB
  - Preview + Retake
        ↓
[STEP 2] Category — grid of icon tiles, not a dropdown
  Pothole | Streetlight | Garbage | Water leak
  Footpath | Drain/Manhole | Electrical | Other
  (Stretch: model pre-selects a guess, user confirms)
        ↓
[STEP 3] Location
  - navigator.geolocation.getCurrentPosition({ enableHighAccuracy: true })
  - Leaflet map, draggable pin
  - Reverse-geocoded address shown as text
  - accuracy value captured silently → sent to backend
  - Fallback: if permission denied, let user search/drop pin manually
        ↓
[STEP 4] Context (optional — must be skippable)
  - Text field, 140 chars
  - Severity self-report: [Minor | Moderate | Severe]
        ↓
[STEP 5] Review & Submit
  - Thumbnail + category + address + note
  - Upload with visible progress bar (tab must stay open)
        ↓
[CONFIRMATION]
  - Ticket ID
  - If clustered into an existing incident:
      "12 others reported this too — that raises its priority."
```

**That clustering message matters more than it looks.** Without it, a duplicate report feels wasted and people stop submitting. With it, duplication feels like contribution — and duplication is precisely what feeds the priority signal.

**Friction budget: under 45 seconds.** Every added field must justify itself against that number.

### 9.4 Tracking (`/my-reports`)
```
Card list → tap → timeline:
    ● Submitted        22 Aug, 4:12 PM
    ● Acknowledged     22 Aug, 6:30 PM   — Public Works
    ● Assigned         23 Aug, 9:00 AM   — Crew #4
    ○ In Progress
    ○ Resolved

  - "14 citizens reported this issue"
  - On resolution: before/after photo comparison
  - "Was this actually fixed?"  [Yes / No]
       → "No" reopens the incident and flags it for admin review
```

**The "No" button is load-bearing.** Without citizen verification, departments can close tickets without doing the work and your analytics become fiction.

### 9.5 Notifications
Primary channel is the **in-app timeline + status badges** (always works). Web Push is an enhancement layered on top via service worker — and it will not fire on un-installed iOS Safari, so never depend on it for the demo.

| Trigger | Message |
|---|---|
| Report accepted | "Report #A2F received." |
| Merged into incident | "Your report joined 11 others — priority raised." |
| Acknowledged | "Public Works has acknowledged your report." |
| Assigned | "A crew has been assigned." |
| Resolved | "Marked resolved. Tap to verify." |
| Stale (14 days) | "Still open. We've escalated it." |

---

## 10. Admin Flow — `/admin` (desktop-first, still responsive)

### 10.1 Roles
| Role | Scope |
|---|---|
| **Super Admin** | All wards/departments, edits severity weights, manages users |
| **Department Head** | Own department's incidents, assigns crews, own analytics |
| **Field Staff** | `/field` only — assigned incidents, status updates, resolution photo |

Enforced with Supabase Row Level Security, not just UI hiding.

### 10.2 Command Center (landing)
Split view:
- **Left 40%:** ranked incident queue, `priority_score DESC`
- **Right 60%:** live Leaflet map — pin color by priority band, pin size by report count

Top strip: Open · Unassigned · Overdue · Resolved this week · Avg resolution time

On mobile, this collapses to tabs (Queue / Map) rather than a split.

### 10.3 The Queue
Row: priority badge · category icon · thumbnail · address · report count · age · status · department

Filters: category, ward, department, status, priority band, date range, `flagged_mismatch`
Sort: priority (default), newest, oldest, most reported
Bulk: multi-select → assign, change status, mark duplicate

### 10.4 Incident detail
```
┌ Photo gallery — all N reports' photos, swipeable ─────┐
├ Map: centroid pin + scatter of individual reports     │
├ PRIORITY BREAKDOWN ← shows WHY it ranks where it does │
│     Severity (Pothole)   6.0                          │
│     Reports (12 users)   5.1                          │
│     Age (3 days)         1.5                          │
│     ──────────────────────────                        │
│     Total                12.6                         │
├ Citizen notes                                         │
├ Status history audit trail                            │
└ Actions: Assign · Status · Reprioritize · Merge · Reject
```

**The breakdown panel is non-negotiable.** An admin who doesn't understand why something ranks high won't trust the ranking and will fall back to sorting by date — which makes the entire engine decorative.

### 10.5 Assignment
```
Assign → department pre-filled by routing engine (editable)
      → pick staff from department roster
      → SLA due date auto-suggested by priority band
      → status = ASSIGNED → all reporters notified
```

### 10.6 Resolution (`/field`, mobile web)
```
Assigned incident → Mark In Progress
                  → Upload resolution photo  [MANDATORY — proof of work]
                  → Mark Resolved + closing note
                  → Citizens notified → verification prompt
                  → If >40% of reporters click "Not fixed"
                       → auto-reopen + flag to Department Head
```

### 10.7 Analytics
- Volume heat map by ward and category
- Avg response time (submit→ack) and resolution time (submit→resolved) per department
- SLA compliance rate
- **Recurrence hotspots** — locations with repeated incident chains; these need infrastructure replacement, not patching
- Reopen rate per department (quality signal)
- Trend: reports/week, backlog growth or decay

---

## 11. Team Split — 4 Independent Workstreams

### The mechanism that makes independence real

Three things, agreed **before anyone writes feature code**:

1. **Freeze the enums** — `category`, `status`, `department`, `severity`. These appear in all four workstreams; changing one later breaks everyone.
2. **Freeze the API contract as Zod schemas** in `/lib/contracts/`. Every endpoint's request and response shape lives here, in one shared file, on day 1.
3. **MSW mocks for every endpoint**, generated from those schemas. This is the whole trick: A and D develop against mocks and never wait on B. When B's real endpoints land, flip one env flag.

Plus: **seed 500 synthetic reports** with realistic clustered coordinates over your city, on day 1. Nobody can build or test clustering, ranking, or maps against an empty table.

---

### 👤 Person A — Citizen Web App
**Routes owned:** `/`, `/report`, `/my-reports`, `/track/[id]`

- Landing page + public map preview
- Camera capture via file input + client-side compression
- Category tile grid, Leaflet location picker, GPS accuracy capture
- Multi-step submission wizard with draft persistence
- Phone OTP auth flow (deferred to submit time)
- Upload progress UI against presigned URLs
- My Reports list + status timeline + verification prompt
- Service worker + web push subscription (enhancement only)

**Stack:** Next.js App Router, Tailwind, shadcn/ui, react-leaflet, TanStack Query, `browser-image-compression`, Zod
**Works independently via:** MSW mocks for all report endpoints
**Owns the contract for:** `POST /api/reports`, `GET /api/my-reports`

---

### 👤 Person B — Backend, Database & Infrastructure
**Owns:** everything under `/api`, the schema, and deployment

- Supabase project, Postgres + PostGIS schema, migrations
- Row Level Security policies for all three roles
- Auth: email + password for everyone (decisions/005 replaced phone OTP)
- Report ingestion endpoint + presigned upload URL generation
- Rate limiting (10/user/hour)
- Supabase Realtime channels for live dashboard
- Vercel Cron endpoints that trigger C's jobs
- Seed data script (**deliver this on day 1 — everyone is blocked without it**)
- Vercel deployment, env config, preview branches

**Stack:** Next.js API routes, Supabase JS client, PostGIS, Zod, Vercel Cron
**Works independently via:** builds against the frozen contract; testable with curl/Postman, needs no UI
**Owns the contract for:** every endpoint shape (publishes the Zod schemas everyone imports)

---

### 👤 Person C — Intelligence Layer
**Owns:** `/lib/engine/` — pure functions plus one cron endpoint

- Clustering: adaptive-radius PostGIS query, centroid recomputation, unique-user counting
- Priority scoring job + `priority_score` / `priority_breakdown` writes
- Configurable severity table and weight tuning
- Routing rules engine
- Recurrence chain detection
- Merge-incidents logic
- *Stretch:* image classification via hosted vision API for category cross-check

**Stack:** TypeScript (no separate runtime), PostGIS spatial functions, Vitest for unit tests
**Works independently via:** the engine is pure functions over the seeded database — testable from a CLI script with zero UI and zero API dependency. Write tests first; this is the most test-friendly workstream on the team.
**Owns the contract for:** the `priority_breakdown` JSON shape that D renders

---

### 👤 Person D — Admin Dashboard & Analytics
**Routes owned:** `/admin/*`, `/field/*`

- Admin auth + role-based access (3 roles)
- Command center: ranked queue + live Leaflet map, responsive collapse to tabs
- Filters, sorting, bulk actions
- Incident detail view including the **priority breakdown panel**
- Assignment and status-transition flows
- Field staff mobile-web view with mandatory resolution photo
- Analytics dashboard: heat map, response times, SLA compliance, recurrence hotspots
- Severity-weight configuration UI

**Stack:** Next.js (server components for tables), Tailwind, shadcn/ui (Table, Dialog, Select), react-leaflet, Recharts, TanStack Query
**Works independently via:** MSW mocks for all admin endpoints; renders `priority_breakdown` from a mocked object until C's real one lands
**Owns the contract for:** `GET /api/incidents`, `PATCH /api/incidents/[id]`

---

### Dependency map — deliberately shallow

```
        ┌─────────── contracts/ (Zod schemas, day 1, all four agree) ──────────┐
        │                                                                      │
   Person A ──┐                                             ┌── Person D
   (citizen)  │                                             │   (admin)
              ├──→ Person B (API + DB) ←── Person C ────────┤
              │                            (engine)         │
        MSW mocks until B lands       reads/writes DB   MSW mocks until B lands
```

Nobody blocks anybody after day 1. C never touches UI. A and D never touch the database. B never touches a component.

### Build order

| Phase | A | B | C | D |
|---|---|---|---|---|
| **1** | Contracts + mocks | **Schema + seed data** | Contracts + test harness | Contracts + mocks |
| **2** | Capture → submit flow | Ingest + storage + auth | Clustering algorithm | Queue + map |
| **3** | Tracking timeline | Realtime + cron wiring | Priority scoring live | Incident detail + assign |
| **4** | Verification loop | Rate limits + RLS hardening | Routing + recurrence | Analytics |
| **5** | Polish on real phones | Load test | Weight tuning | Demo dashboard state |

**Integration rule:** merge to `main` daily. The most common hackathon failure is four working pieces meeting for the first time three hours before submission.

---

## 12. Additional Features Worth Considering

Ordered by demo impact ÷ build cost:

1. **"N others reported this"** — nearly free, best retention mechanic in the product
2. **Priority breakdown panel** — cheap, and it's what makes judges believe the algorithm is real
3. **Mandatory resolution photo** — one field, creates genuine accountability
4. **Citizen verification of fixes** — closes the loop, prevents fake closures
5. **Recurrence hotspot detection** — falls out of the incident chain almost free; reframes the product from "ticket queue" to "infrastructure intelligence"
6. **Public transparency map** — read-only, no auth, strong civic-engagement talking point
7. **Photo auto-classification** — highest wow, highest cost; only if core is stable
8. **Equity normalization** — mention in the pitch even if unbuilt
9. **SLA escalation** — auto-notify department head past due date
10. **Ward scorecards** — public department performance comparison

---

## 13. Success Metrics

| Metric | Target |
|---|---|
| Submission time (tap → submitted) | < 45s |
| Duplicate reduction (reports ÷ incidents) | > 2.5× |
| Time to acknowledge | < 24h |
| Reopen rate | < 10% |
| Repeat reporter rate | > 30% |
| Lighthouse mobile performance | > 85 |

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| Browser GPS too imprecise → bad clustering | Adaptive radius using reported accuracy; draggable pin |
| iOS Safari camera/push quirks discovered late | Test on a real iPhone in phase 1, not phase 5 |
| Upload dies when tab closes | Presigned URL + visible progress; keep user on-screen |
| Clustering too aggressive → distinct issues merged | Same-category-only rule; admin split action |
| Clustering too loose → duplicates persist | Adaptive radius; admin merge action |
| Empty-database demo | Seed script is Person B's **day-1** deliverable |
| Admin distrusts ranking, sorts by date | Priority breakdown panel |
| Four-way integration failure at the end | Frozen Zod contracts + MSW mocks + daily merges |
| Volume ranking entrenches area bias | Equity normalization (documented, stretch) |
