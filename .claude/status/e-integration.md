---
owner: Durgesh
workstream: E integration
last_sync: 2026-08-22T05:00:28+05:30
head: da6188f
---

# E integration — Durgesh

## Owns
`lib/contracts/**`, `mocks/**`, `components/ui/**`, the daily merge to `main`,
the Vercel deploy, and the demo script.

Also running workstream **B** (see `b-backend.md`).

## Shipped
Works, pushed, safe for others to build on.
- Nothing yet — Day 0.

## In flight
Started, not safe to depend on yet.
- `lib/contracts/enums.ts` — the four frozen enums as Zod, single import source
  for all five workstreams — **expect first, everything else waits on it**
- `lib/contracts/report.ts`, `incident.ts` — request/response shapes for
  `POST /api/reports`, `GET /api/my-reports`, `GET /api/incidents`,
  `PATCH /api/incidents/[id]`, presigned-upload
- `mocks/` — MSW handlers generated off those schemas, one env flag to flip
- `.claude/decisions/004-*.md` — resolving the three open questions in 003

## I need from you
- **@Dev (A)** — my recommendation on your three enum questions, so you are not
  blocked: (1) **no** `STRAY_ANIMAL` — it stays in `OTHER`, your 3x3 grid holds at
  9 categories; (2) voice notes **out of v1 UI**, but I reserve an optional
  nullable `voice_note_url` in the report schema so adding it later is not a
  breaking change; (3) severity self-report **stays, advisory only** — keep your
  Step 4 as designed, it does not feed the scorer. Awaiting your ack, then I write
  decision 004 and freeze.
- **@C** — the `priority_breakdown` JSON shape. Blocks: the Zod schema D renders
  the breakdown panel from. Until you post it I will publish a provisional shape
  `{ severity, reports, age, recurrence, total }` and mark it PROVISIONAL.
- **@D** — confirm you will consume `GET /api/incidents` paged
  (`?cursor=&limit=`) rather than offset. Blocks: freezing that response envelope.

## Heads up
Things I changed that affect other people. Delete once everyone has pulled.
- *(none yet — first Heads up will be the contracts landing)*

## Notes for my own agent

### Why E exists
PRD §14 names four-way integration failure as the top risk. E's whole job is the
three things PRD §11 says must exist before feature code: frozen enums, frozen
Zod contracts, MSW mocks generated from them. Plus daily merge to `main`.

### Contract discipline
- Contracts are **additive-only** once published. Adding an optional field is
  free; renaming or removing one breaks four people silently at runtime, because
  a mismatched string enum is not a compile error.
- Every enum has exactly one definition: `lib/contracts/enums.ts`. Nobody
  re-declares a category union in their own file. If I see one, I delete it.
- MSW mocks are generated from the schemas, never hand-written to match them.
  Hand-written mocks drift and then A and D build against fiction.

### Current dependency picture (read from all five status files, 2026-08-22)
- A = Dev, claimed, scaffolding Next.js, blocked on **me** for contracts + mocks
  and on the three enum questions. He is the critical consumer today.
- C and D = still UNCLAIMED. Nobody is writing `lib/engine/**` or `app/admin/**`.
  Until someone claims them, do not build against assumptions about their shape —
  publish provisional contracts and mark them so.
- B = me. My seed script is the day-1 unblock for A, C and D per decision 002.

### Danger zones
- Do NOT touch anyone's status file but `b-backend.md` and `e-integration.md`.
- Do NOT touch `app/(citizen)/**`, `app/report/**`, `app/my-reports/**`,
  `app/track/**`, `lib/engine/**`, `app/admin/**`, `app/field/**`.
- `components/ui/**` is mine, but it is shadcn primitives only — no feature
  components. A and D compose their own screens.
- `/sync` stages `.claude/` only. Never `git add -A`.
