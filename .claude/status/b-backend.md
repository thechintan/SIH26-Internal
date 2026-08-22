---
owner: Durgesh
workstream: B backend
last_sync: 2026-08-22T05:40:00+05:30
head: 8d4f56b
---

# B backend — Durgesh

## Owns
`app/api/**`, `supabase/**`, `scripts/seed*`

Also running workstream **E** (see `e-integration.md`). Two hats, two files,
never merged — B is API/DB/infra, E is contracts/mocks/merge/demo.

## Shipped
Works, pushed, safe for others to build on.

- **`supabase/migrations/0001_init.sql`** — PostGIS, the four frozen enums as
  Postgres types, all nine tables (`users`, `departments`, `wards`,
  `category_severity`, `incidents`, `reports`, `incident_reporters`,
  `status_history`, `report_verifications`), the three required indexes, ticket-ID
  generation, and reference seed rows.
  - `report_count` is maintained by a trigger from `incident_reporters`, so it is
    a count of distinct people and cannot be inflated by resubmitting.
  - The status-transition guard is a database trigger, not just API validation —
    the cron, the seed script and any manual fix all write through Postgres too.
    It also rejects `RESOLVED` without a `resolution_photo_url`.
- **`supabase/migrations/0002_rls.sql`** — RLS for all four roles. Incidents are
  publicly readable (PRD §9.1 wants the map browsable logged out); reports are
  not — someone else's photo, exact coordinates and free-text note are not public
  data. Role escalation is blocked by a trigger, since a `WITH CHECK` cannot see
  the old row.
- **`supabase/migrations/0003_spatial_functions.sql`** — `find_nearby_open_incident`,
  `find_previous_closed_incident`, `recompute_centroid`, `ward_for_point`,
  `report_count_last_hour`, `public_stats`.
- **`scripts/seed.ts`** — 500 reports across eight weighted hotspots, 120
  citizens, 6 wards. Deterministic seed, so the demo database is identical every
  run. Reports reprints the reports-per-incident ratio and warns if it falls
  under PRD §13's 2.5× target.
- **`supabase/README.md`** — how to apply and seed.
- **Supabase project exists** — `SIH26`, ap-northeast-2, healthy. Project URL is
  in `.env.local` (gitignored). Keys are the human's to paste.
- **`lib/supabase/`** — `env.ts` (validated env, and a guard that throws if the
  service key is ever reached from browser code), `admin.ts` (service role,
  bypasses RLS, server only), `client.ts` (browser, carries the citizen session),
  `request.ts` (`getCaller()` — runs queries as the caller so RLS applies).
- **`lib/api/`** — every endpoint's logic as plain `Request → Response`
  functions: `reports.ts`, `incidents.ts`, `uploads.ts`, `respond.ts`, and
  `clustering.ts`. Testable without a Next server; the route files under
  `app/api/**` will be three-line re-exports.

## In flight
Started, not safe to depend on yet.
- Migrations are written but **not yet applied to the live project** — waiting on
  the anon and service-role keys landing in `.env.local`
- `app/api/**` route files — the handler logic is done in `lib/api/`; the route
  files themselves wait for A's scaffold, because creating `app/` first would
  make his `create-next-app` refuse to run
- Vercel Cron endpoint for rescoring — after the routes

## I need from you
- **@Durgesh (human, not an agent task)** — create the Supabase project, enable
  PostGIS, and put `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. I cannot create accounts or
  handle credentials. Blocks: running the migrations and the seed, which blocks
  C and D having real data.
- **@Dev (A)** — do not create `app/api/**` or `supabase/**`, even as stubs. If
  `create-next-app` generates `app/api/hello`, delete it.
- **@C** — confirm clustering runs synchronously inside the ingest request rather
  than on a queue. I am building `POST /api/reports` that way. Blocks: the shape
  of the ingest endpoint. `0003` gives you the spatial primitives; the decisions
  (join or seed, radius adaptation, when a recurrence chain starts) are yours in
  `lib/engine`.
- **@C** — the `priority_breakdown` JSON shape. The column is `jsonb` either way,
  but E needs it to unfreeze the provisional schema D renders.

## Heads up
Things I changed that affect other people. Delete once everyone has pulled.
- **Schema landed** → affects C and D → the table and column names in
  `0001_init.sql` are what the API will return. Read it before writing queries.
- **`lib/api/clustering.ts` is C's work sitting in B's folder** → affects C →
  it implements PRD §6 exactly and exists only because `lib/engine/**` is
  unclaimed and the ingest endpoint cannot return a truthful "N others reported
  this" without it. When C lands, delete this file and change one import in
  `lib/api/reports.ts`. Do not evolve both copies.
- **`address` added to the report contract and to both tables** → affects A →
  send a reverse-geocoded `address` on `POST /api/reports` (OSM Nominatim is free
  and needs no key). Optional, so nothing breaks without it, but the admin queue
  shows "Location pinned" for every row that omits it.
- **PRD §5's partial index predicate widened** → affects C and D → the PRD writes
  it as `status != 'RESOLVED'`, but the frozen enum has four closed states, so the
  index excludes `RESOLVED`, `VERIFIED`, `REJECTED` and `DUPLICATE`. Otherwise it
  carries dead rows forever. Not an enum change, so no decision file.

## Notes for my own agent

### Day 0 state
- A (Dev) owns the Next.js scaffold and had not pushed it as of `8d4f56b`. I do
  **not** run `create-next-app` — I build on top of his and add my deps then.
- No Supabase project exists yet. Everything so far is verified by `tsc --strict`
  and by reasoning against the PRD; **no migration has been run against a real
  database.** Treat the SQL as unexecuted until it is.
- C and D are still `UNCLAIMED`. Nobody is writing `lib/engine/**` or `app/admin/**`.

### Hard rules for my paths
- **Never compute priority score on page load.** Vercel Cron → API route → C's
  scorer → writes `priority_score` and `priority_breakdown`.
- `report_count` is `count(distinct user_id)` from `incident_reporters`. Never
  `count(*)` on reports.
- `location` is `geography(Point,4326)`, not two floats. The PRD §6 clustering
  query cannot exist otherwise.
- RLS enforced in Postgres, not hidden in the UI.
- Presigned URL straight to Supabase Storage; the file never passes through a
  Next.js route — a serverless body limit would cap photo size.
- Never cluster into a closed incident. New incident, set `previous_incident_id`.
- Rate limit 10 reports/user/hour, counted in the database. An in-process counter
  on Vercel limits nothing, because invocations do not share memory.

### Gotchas already hit
- The seed `--reset` has to null `previous_incident_id` before deleting incidents;
  the table has a self-referencing FK.
- Seeding citizens goes through `auth.admin.createUser`, because `public.users.id`
  is FK'd to `auth.users`. A plain insert into `public.users` fails.
- `STATUS_TRANSITIONS` exists twice on purpose — TypeScript in
  `lib/contracts/enums.ts`, PL/pgSQL in `0001_init.sql`. Change one and you must
  change the other. Considered generating the SQL from the TS and rejected it:
  one more build step for a nine-row table nobody edits.

### Danger zones
- Do NOT import from the discarded NestJS + MongoDB `backend/` (decisions/002).
  It has no `incidents` collection and its duplication model is the exact thing
  PRD §4 forbids.
- Do NOT touch `app/(citizen)/**`, `app/report/**`, `app/my-reports/**`,
  `app/track/**`, `lib/engine/**`, `app/admin/**`, `app/field/**`.
- `package.json` / `next.config.js` / `tailwind.config.ts` are shared — post a
  Heads up before editing.
