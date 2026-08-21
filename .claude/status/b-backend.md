---
owner: Durgesh
workstream: B backend
last_sync: 2026-08-22T05:00:28+05:30
head: da6188f
---

# B backend — Durgesh

## Owns
`app/api/**`, `supabase/**`, `scripts/seed*`

Also running workstream **E** (see `e-integration.md`). Two hats, two files, never
merged — B is API/DB/infra, E is contracts/mocks/merge/demo.

## Shipped
Works, pushed, safe for others to build on.
- Nothing yet — Day 0.

## In flight
Started, not safe to depend on yet.
- Supabase project + PostGIS enabled — expect this session
- `supabase/migrations/0001_init.sql` — enums, `reports`, `incidents`, `users`,
  `departments`, `wards`, `category_severity`, `status_history`,
  `incident_reporters` + the three required indexes (PRD §5) — expect this session
- `scripts/seed.ts` — 500 synthetic reports, realistically clustered — **day-1
  unblock for A, C and D**, expect this session

## I need from you
- **@Dev (A)** — do not create `app/api/**` or `supabase/**` even as stubs while
  scaffolding. If `create-next-app` generates `app/api/hello`, delete it and tell
  me. Blocks: nothing yet, but a stray route file will collide with my ingest work.
- **@C** — confirm you want clustering to run **inside** the ingest transaction
  (I call your pure function from `POST /api/reports`) rather than on a queue.
  Blocks: the shape of my ingest endpoint. Assuming synchronous-in-request until
  you say otherwise.
- **@C** — the exact `priority_breakdown` JSON shape you will write. I will make
  the column `jsonb` either way, but E needs it to freeze the Zod schema D renders.

## Heads up
Things I changed that affect other people. Delete once everyone has pulled.
- *(none yet)*

## Notes for my own agent

### Day 0 state
- Repo is empty of source. Only `.claude/` exists. A (Dev) is scaffolding Next.js
  this session — I do **not** run `create-next-app` myself, I build on top of his.
- Node v24.13.0 / npm 11.6.2 on this machine. Dev is on Node v22.19.0.
- No Supabase project exists yet. Credentials are the human's job, not the agent's.

### Hard rules for my paths
- **Never compute priority score on page load.** Vercel Cron → API route → C's
  scorer → writes `priority_score` + `priority_breakdown`. PRD §7.
- `report_count` is `count(distinct user_id)` from `incident_reporters`. Never
  `count(*)` on reports. That join table exists purely to make inflation impossible.
- Rate limit 10 reports/user/hour at the API layer, plus `device_fingerprint`.
- Location is `geography(Point,4326)`, **not** two float columns. PostGIS or the
  clustering query C needs cannot exist.
- RLS enforced in Postgres for all four roles, not hidden in the UI. PRD §10.1.
- Upload path is presigned URL → Supabase Storage direct from the browser. The API
  issues the URL; the file never passes through a Next.js route.
- Never cluster into a `RESOLVED` incident — new incident, set `previous_incident_id`.

### Danger zones
- Do NOT import from the discarded NestJS + MongoDB `backend/` (decision 002).
  There is no `incidents` collection there; its whole duplication model is the
  thing the PRD forbids.
- Do NOT touch: `app/(citizen)/**`, `app/report/**`, `app/my-reports/**`,
  `app/track/**`, `lib/engine/**`, `app/admin/**`, `app/field/**`.
- `package.json` / `next.config.js` / `tailwind.config.ts` are shared — post a
  Heads up here before editing.
