---
owner: Dev
workstream: A citizen
last_sync: 2026-08-22T04:50:54+05:30
head: 3052d21
---

# A citizen — Dev

## Owns
`app/(citizen)/**`, `app/report/**`, `app/my-reports/**`, `app/track/**`

## Shipped
Works, pushed, safe for others to build on.
- Next.js 14 project scaffold + route skeleton
- Landing page (`/`) static shell
- Route folders: `app/(citizen)`, `app/report`, `app/my-reports`, `app/track/[id]`

## In flight
Started, not safe to depend on yet.
- Report wizard Steps 1-5 (building against MSW mocks) — expect by next sync

## I need from you
- **@B** — Presigned upload URL endpoint shape — needed for Step 5 upload progress bar. Will work against MSW mock until real endpoint lands.

## Heads up
Things I changed that affect other people. Delete once everyone has pulled.
- **Added scripts to package.json** → affects E → I added `verify:mocks` and `seed` as requested.
- **Added deps** → affects everyone → added `@supabase/supabase-js`, `tsx` and initialized `msw` in `public/`.

## Notes for my own agent

### Day 0 context
- Repo is a clean slate. Only `.claude/` folder exists. No Next.js project yet.
- All 5 status files were UNCLAIMED at session start.
- git user: `Devprajapati09 <dprajapati@962007>`
- Node v22.19.0, npm 10.9.3 — confirmed working.
- `npx create-next-app@latest` resolves to v16.3.2 (Next.js 15 App Router) — compatible with PRD requirement of Next.js 14+.

### Critical rules to remember
- Citizens create **reports**. Admins act on **incidents**. Never blur this in the UI.
- `/my-reports` and `/track/[id]` show the citizen their **report** status, not raw incident data.
- Confirmation screen after submit MUST show "N others reported this" — this is what makes duplication feel like contribution.
- The "Was this actually fixed?" No button is load-bearing — it triggers `REOPENED` status.
- Auth (phone OTP) is deferred to submit time, not app open. Draft state survives auth.
- Upload MUST show a visible progress bar. Tab must stay open. Presigned URL direct to Supabase Storage.
- Step 2 category grid: use tile icons, NOT a dropdown.
- GPS `accuracy` value must be captured silently and sent to backend — feeds adaptive clustering radius.
- Test camera, GPS, and upload on a REAL phone, not Chrome DevTools.

### Danger zones
- Do NOT import anything from old `citizen_app/` (Flutter), `admin-portal/` (Vite+React), or `backend/` (NestJS+MongoDB). Those branches are dead.
- Do NOT touch: `app/api/**`, `supabase/**`, `lib/engine/**`, `lib/contracts/**`, `mocks/**`, `app/admin/**`, `app/field/**`
- Shared files that need a Heads Up before touching: `package.json`, `tailwind.config.ts`, `next.config.js`, anything in `.claude/context/`

### Enums I consume (frozen — changing requires a decision file)
- **Category (9):** `STRUCTURAL`, `ELECTRICAL`, `DRAIN_MANHOLE`, `WATER_LEAK`, `POTHOLE`, `FOOTPATH`, `GARBAGE`, `STREETLIGHT`, `OTHER`
- **Status (9):** `SUBMITTED`, `ACKNOWLEDGED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `VERIFIED`, `REOPENED`, `REJECTED`, `DUPLICATE`
- **Severity self-report:** `MINOR`, `MODERATE`, `SEVERE` (advisory only, Step 4)

### Phase plan
1. Scaffold Next.js + route skeleton
2. Landing page + public Leaflet map
3. 5-step report wizard (Steps 1–5) against MSW mocks
4. OTP auth at submit time
5. My Reports list + Track timeline (all 9 states)
6. Verification loop (Yes/No prompt)
7. Polish on real phone — Lighthouse mobile > 85
