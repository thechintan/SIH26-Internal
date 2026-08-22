---
owner: Durgesh
workstream: E integration
last_sync: 2026-08-22T07:00:00+05:30
head: 4006686
---

# E integration — Durgesh

## Owns
`lib/contracts/**`, `mocks/**`, `components/ui/**`, the daily merge to `main`,
the Vercel deploy, and the demo script.

Also running workstream **B** (see `b-backend.md`).

## Shipped
Works, pushed, safe for others to build on.

- **Enums frozen** — `decisions/004` closes the three open questions in `003`
  and marks `context/ENUMS.md` 🔒 FROZEN. `decisions/005` collapses the two
  auth paths into email/password for everyone.
- **`lib/contracts/`** — every endpoint's request/response, the frozen enums,
  `STATUS_TRANSITIONS`, `canTransition()`, `CATEGORY_DEPARTMENT`, the shared
  `ApiError` envelope. Additive-only from here.
- **`mocks/`** — MSW handlers for all 10 endpoints, generated from the schemas.
  Handlers validate their own responses against the real Zod on the way out, so
  a drifted mock fails loudly instead of teaching the wrong shape. `mocks/README.md`
  has the two-line setup.
- **`mocks/verify.ts`** — parses every fixture through its contract and checks
  product invariants (breakdown terms sum to the total, a `RESOLVED` incident
  always has a resolution photo, the queue is ranked by score descending). Also
  guards **engine ↔ contract drift**: `Category`, `Status`, `Department`,
  `PriorityTier`, the tier thresholds, the formula weights and the full routing
  table all have to agree between `lib/contracts/enums.ts` and
  `lib/engine/types.ts`. All green today.
- **`PriorityBreakdown` shape aligned with C** — nested `factors.severity.weighted`
  etc. plus `score` and `tier` at the top level. Provisional label removed.
  D updated to the new shape in commit `0c0f06c`.
- **Fixed C's engine barrel drift** — after they renamed `SeverityEnum` to
  reuse `SeveritySelf` from contracts, `lib/engine/index.ts` still re-exported
  the old name and broke `tsc` for every consumer. One-line cleanup.

## In flight
Started, not safe to depend on yet.
- Vercel deploy — needs the human to run `vercel link`. After that I wire env
  vars and confirm the cron schedule.
- Demo script — draft after the whole stack has been walked once end-to-end.
- `components/ui/**` shadcn primitives — no consumer yet. A used lucide-react
  directly, D wrote their own components. I will land primitives only if the
  team starts duplicating patterns.

## I need from you
- **@Dev (A)** — five lint errors block `next build` for the whole team,
  all in your files:
  1. `app/report/steps/step5-auth.tsx:49` — `any` type
  2. `app/report/steps/step5-review.tsx:80,82` — two unescaped apostrophes
  3. `app/track/[id]/page.tsx:10,111` — unused imports `MapPin` and `data`

  Every one is 5 seconds of mechanical work. Not touching them because you are
  live in that directory.
- **@C** — three unused imports also block the build:
  - `lib/engine/clustering.ts:28` — `StatusEnum` unused
  - `lib/engine/merge.ts:19` — `StatusEnum` unused
  - `lib/engine/__tests__/routing.test.ts:5` — `CATEGORY_DEPARTMENT_MAP` unused
- **@C** — `rescoreAllIncidents` did 304 rows in 72s (one UPDATE per row).
  Verified end-to-end and correct — scores and breakdown are populated on the
  live DB — but Vercel Hobby's cron timeout is 10s and Pro is 15min. Batch the
  update (one UPDATE ... FROM VALUES ..., or a Postgres function) before we
  seed anything bigger than a demo. Not blocking today.

## Heads up
Things I changed that affect other people. Delete once everyone has pulled.
- **Rescoring pipeline ran on the live DB** → affects D → all 304 open
  incidents have real `priority_score` and `priority_breakdown`. The queue now
  ranks; pull to see it.

## Notes for my own agent

### Why E exists
PRD §14 names four-way integration failure as the top risk. The three
pre-conditions PRD §11 requires are all live: frozen enums, frozen Zod
contracts, MSW mocks generated from them. Daily merge to `main` is happening
organically because everyone has been pushing to `main` and rebasing.

### Contract discipline
- Additive-only once published. Adding an optional field is free; renaming or
  removing one breaks four people at runtime.
- One definition per enum, in `enums.ts`. C redeclared them in the engine
  today; every value matches, but the drift guard in `verify.ts` is now the
  wire that will trip if they ever move. Long-term ask: engine imports from
  contracts.
- Mocks are generated from schemas, never hand-written to match them.

### Findings worth keeping
- The first fixture generator drew report counts uniformly and produced 23 of
  60 incidents CRITICAL with zero LOW. Real report volume is long-tailed, so
  the generator now cubes the random draw. Live queue spread today is 50 /
  118 / 99 / 37 across CRITICAL / HIGH / MEDIUM / LOW — real-looking.
- The tier thresholds (20 / 14 / 8) are still PROVISIONAL by `003` and were
  excluded from the freeze. The live spread confirms they are usable; the
  formal re-check can wait until phase 5.

### Danger zones
- Only `b-backend.md` and `e-integration.md` are mine to write.
- `components/ui/**` is shadcn primitives only. A and D compose their own screens.
- `/sync` stages `.claude/` only. Never `git add -A`.
