---
owner: Durgesh
workstream: B backend
last_sync: 2026-08-22T07:00:00+05:30
head: 4006686
---

# B backend — Durgesh

## Owns
`app/api/**`, `supabase/**`, `scripts/seed*`

Also running workstream **E** (see `e-integration.md`). Two hats, two files,
never merged — B is API/DB/infra, E is contracts/mocks/merge/demo.

## Shipped
Works, pushed, safe for others to build on.

- **All three migrations applied to the live Supabase project** — 9 tables,
  17 RLS policies, 6 spatial/rate-limit RPCs, ticket-ID generation, the
  status-transition guard, the unique-user report_count trigger, and the
  category-severity seed row. See `supabase/README.md` for how to reapply.
  - `report_count` is trigger-maintained from `incident_reporters`, so it is
    a count of distinct people and cannot be inflated by resubmitting.
  - `RESOLVED` without a `resolution_photo_url` is rejected by the trigger —
    proof-of-work enforced in the database, not only the API.
- **Supabase Storage buckets live** — `report-photos`, `resolution-photos`,
  `voice-notes`. All three verified end-to-end (presign → PUT → delete).
- **`scripts/seed.ts`** — has been run. Live DB carries **777 reports / 304
  incidents / 2.55× ratio** clustered on eight weighted hotspots. Deterministic
  seed. Priority scores are populated (see below).
- **`app/api/**` — all nine route files** (`/api/reports`, `/api/reports/:id`,
  `/api/reports/:id/verify`, `/api/my-reports`, `/api/uploads`, `/api/incidents`,
  `/api/incidents/:id`, `/api/incidents/merge`, `/api/stats`). Logic lives in
  `lib/api/` so it can be unit-tested without a Next server.
- **`lib/supabase/`** — `env.ts` (validated env + browser guard on the service
  key), `admin.ts` (service role, server only), `client.ts` (browser session),
  `request.ts` (`getCaller()` runs queries as the caller so RLS applies).
- **`lib/supabase/rows.ts`** — hand-written row types for every table the API
  selects; nothing under `lib/api` falls back to `any`.
- **Rescoring pipeline verified against the live DB** — called C's
  `rescoreAllIncidents(supabaseAdmin())` directly. 304 open incidents scored,
  0 errors, all `priority_score` and `priority_breakdown` columns populated.
  Top row is a STRUCTURAL incident with 15 reporters open 18 days (score 24.95);
  spread is 50 CRITICAL / 118 HIGH / 99 MEDIUM / 37 LOW.
- **Cron endpoint at `app/api/cron/rescore/route.ts`** — landed by C in B's
  territory, thin wrapper around `rescoreAllIncidents`, guarded by
  `CRON_SECRET`. `vercel.json` schedules it every 5 minutes.

## In flight
Started, not safe to depend on yet.
- `app/api/uploads` end-to-end test with a real citizen JWT — plumbing works,
  the read path (fetching a signed URL to display a photo) is not yet a helper
- Storage read-signing helper — will land when Dev consumes it in the report
  detail view

## I need from you
- **@Durgesh (human)** — a `CRON_SECRET` needs to exist in Vercel's env before
  the deploy, otherwise the rescore endpoint is publicly hittable. Any random
  32-byte hex. Local `.env.local` can leave it unset — the endpoint is
  unauthenticated in dev on purpose so we can hit it with curl.
- **@Durgesh (human)** — `vercel link` from the repo root when you're ready to
  deploy. After that I add the env vars and confirm the cron schedule.

## Heads up
Things I changed that affect other people. Delete once everyone has pulled.
- **Live DB has real priority scores now** → affects D → the admin queue
  actually ranks; no need to keep sorting by newest as a fallback. Pull to see
  the seeded ordering match what the breakdown panel shows.

## Notes for my own agent

### Where we are on PRD phases

- **Phase 1** (schema + seed): done
- **Phase 2** (ingest + storage + auth): done
- **Phase 3** (realtime + cron): cron endpoint is done; Supabase Realtime is
  not wired yet — nothing consumes it yet, so it is deferred to when D wants
  live queue updates
- **Phase 4** (rate limits + RLS hardening): rate limits done; RLS applied;
  hardening pass (a script that assumes an anon user and confirms it cannot
  read cross-user reports) is worth doing before demo
- **Phase 5** (load test): unstarted

### Findings worth keeping

- Rescoring 304 incidents took 72 seconds because it is one row-update per
  incident. Vercel Hobby's cron timeout is 10s, Pro is 15min. At 100k rows this
  needs a batched update. Not my code — flagged to C. Not blocking today.
- The `report-photos` bucket was created with "Any" MIME type by default. My
  API validates content_type before signing, so it is fine, but the other two
  buckets have `image/jpeg,image/png,image/webp` set at the bucket level for
  defense-in-depth. Worth tightening in the dashboard when there is a moment.
- `tsx` does not load `.env.local` the way `next dev` does. Scripts that need
  the Supabase keys have to load it themselves; `scripts/seed.ts` does this.

### Hard rules for my paths
- **Never compute priority score on page load.** The cron writes it; the
  dashboard reads `ORDER BY priority_score DESC`.
- `report_count` is `count(distinct user_id)` from `incident_reporters`. Never
  `count(*)` on reports.
- `location` is `geography(Point,4326)`, not two floats. Generated `lat`/`lng`
  columns exist for the read path so nothing unpacks it per row.
- RLS enforced in Postgres, not hidden in the UI.
- Never cluster into a closed incident. New incident, set `previous_incident_id`.

### Danger zones
- Do NOT import from the discarded NestJS + MongoDB `backend/` (decisions/002).
- Do NOT touch `app/(citizen)/**`, `app/report/**`, `app/my-reports/**`,
  `app/track/**`, `lib/engine/**`, `app/admin/**`, `app/field/**`.
- `package.json` / `next.config.js` / `tailwind.config.ts` are shared — post a
  Heads up before editing.
