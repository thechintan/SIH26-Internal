# 002 — Discard the earlier build; rebuild on the PRD stack

**Status:** ✅ Accepted · **Decided:** 2026-08-22 by Durgesh

## Decision

The earlier codebase is discarded. We build fresh against PRD v2.0:
Next.js 14 App Router · TypeScript · Supabase (Postgres + PostGIS) · Tailwind +
shadcn/ui · Leaflet · Recharts · Vercel.

Commit `be5ce80 "Empty repository"` was **intentional**, not an accident. It is
the start of this rebuild.

## What was discarded

267 files across three separate codebases:

| Part | Was |
|---|---|
| `citizen_app/` | Flutter native Android (Kotlin, `com.civicpulse.citizen`) |
| `admin-portal/` | Vite + React SPA (react-router, zustand) |
| `backend/` | NestJS + MongoDB / Mongoose |

Still in history at `ca1add4`, and in `origin/admin-portal` / `origin/mobile-app`,
purely so nothing is unrecoverable. **Do not import from it.** It is not a
reference implementation and it is not precedent.

## Why

Three codebases in three languages, and the data model had no `incidents`
collection — duplication was handled by pointing one report at another and
counting upvotes, with the admin queue working on raw reports. PRD §4 forbids
exactly that: citizens create reports, admins act on incidents.

Clustering, the priority score, and the breakdown panel are the product's actual
thesis and the part judges score. Retrofitting an incident model onto a schema
built without one, across a Flutter app and a separate SPA, is more work than
building it right once on a single Next.js codebase.

One language, one repo, one deploy. Judges open a URL on their own phone.

## Consequences

- `main` starts empty. Person B's seed script is the day-1 unblock for everyone
  else — the PRD is explicit about this and it is now the critical path.
- No auth, OTP, or routing engine exists any more. All of it is rebuilt on
  Supabase Auth.
- Two ideas from the discarded build are worth keeping on their merits, not
  because they were there before: **voice notes** on a report (accessibility win
  for low-literacy users, and a strong SIH talking point) and **`VERIFIED` /
  `REOPENED` as first-class statuses** rather than a boolean. Both carried into
  `decisions/003`.

## Supersedes

The "two candidate path maps" ambiguity in `AGENTS.md`. Path ownership is now the
single Next.js table.
