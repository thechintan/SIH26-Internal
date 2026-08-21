# CivicReport (SIH26) — Agent Orientation

**Every AI tool on this repo reads this file.** Claude Code, Antigravity, Cursor,
Copilot. If you are an agent, read it fully before touching anything.

---

## FIRST ACTION OF EVERY SESSION

**Read every file in `.claude/status/`.** All five, including the ones that are
not your operator's.

Five people build this repo in parallel. Those files are how each person's agent
reports what they shipped, what is half-finished, and what they need from someone
else. The code on disk is only as fresh as the last pull — the status files are
the only place that says what is *in flight right now*.

Each header carries `last_sync` and `head`. If a file is more than a few hours
stale, distrust its "In flight" section and check `git log` for that person's
paths instead.

---

## What this project is

A civic issue reporting and prioritization platform. Citizens submit **reports**
(photo + category + location). The system groups reports into **incidents** (one
real-world problem), ranks incidents by a **priority score**, and routes them to
municipal departments.

- Full spec — `.claude/context/PRD.md`
- Shared vocabulary, use these exact words — `.claude/context/GLOSSARY.md`
- Enums — `.claude/context/ENUMS.md`
- Decisions, one file each — `.claude/decisions/`

**This is a fresh build.** The repo history contains an earlier Flutter + NestJS
+ MongoDB attempt that was deliberately discarded (`decisions/002`). Do not
import from it, do not restore it, do not cite it as precedent. It is kept in
history only so nothing is unrecoverable.

**Stack:** Next.js 14 App Router · TypeScript · Tailwind + shadcn/ui · Supabase
(Postgres + PostGIS) · Leaflet · Recharts · Vercel. Locked — see PRD §3.

---

## The single-writer rule — the one rule that keeps this working

> **You write exactly one status file: your own. You never write anyone else's.**

This is not etiquette, it is how the merges stay clean. Git conflicts happen
per-file. Five people appending to one shared status file would conflict on every
pull, and within a day people start resolving with `git checkout --theirs` and
silently destroying each other's context.

Disjoint files merge cleanly forever. So:

- Your status lives at `.claude/status/<your-workstream>.md`. Only you touch it.
- Need something from a teammate? Write it under **"I need from you"** in *your*
  file. Do not edit theirs. `/handoff` does this for you.
- Decisions get **one file each** — `.claude/decisions/004-slug.md`. Never one
  shared decision log, for the same reason.

---

## Path ownership

| Stream | Status file | Owns |
|---|---|---|
| A — Citizen | `a-citizen.md` | `app/(citizen)/**`, `app/report/**`, `app/my-reports/**`, `app/track/**` |
| B — Backend | `b-backend.md` | `app/api/**`, `supabase/**`, `scripts/seed*` |
| C — Engine | `c-engine.md` | `lib/engine/**` |
| D — Admin | `d-admin.md` | `app/admin/**`, `app/field/**` |
| E — Integration | `e-integration.md` | `lib/contracts/**`, `mocks/**`, `components/ui/**` |

**Shared files — never edit without posting a "Heads up" in your status:**
`package.json`, lockfiles, `tailwind.config.ts`, `next.config.js`, anything in
`.claude/context/`.

Person E exists because the PRD's own risk table names four-way integration
failure as the top risk. E owns the frozen Zod contracts, the MSW mock layer, the
daily merge to `main`, and the demo script — the things that make "nobody blocks
anybody after day 1" true rather than aspirational.

---

## Working agreement

- **Commit to `main`.** The split above is file-disjoint by design, so conflicts
  are rare. Use a branch only for something risky or sweeping.
- **Merge daily, minimum.** Most hackathon teams lose here, not in the code.
- **Run `/sync` when you finish a chunk of work**, not on a timer. It pulls,
  summarizes what your teammates did, rewrites your status file, and pushes.
- **`/sync` only ever commits `.claude/` files.** It must never `git add -A`.
  Someone will run it mid-refactor and push a broken tree.
- **Changing a frozen enum requires a decision file.** All five workstreams
  import them; a silent change breaks four people at once.
