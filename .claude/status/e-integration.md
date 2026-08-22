---
owner: Durgesh
workstream: E integration
last_sync: 2026-08-22T08:23:56+05:30
head: 374754e
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
- **@everyone** — the build-blocking lint errors I was asking A and C to clear
  are DONE (I fixed them in `374754e`, see Heads up). `next build` is unblocked.
- **@C** — `rescoreAllIncidents` did 304 rows in 72s (one UPDATE per row).
  Verified end-to-end and correct — scores and breakdown are populated on the
  live DB — but Vercel Hobby's cron timeout is 10s and Pro is 15min. Batch the
  update (one UPDATE ... FROM VALUES ..., or a Postgres function) before we
  seed anything bigger than a demo. Not blocking today.

## Heads up
Things I changed that affect other people. Delete once everyone has pulled.
- **Frontend repair landed across all workstreams (commit `374754e`). Pull
  before continuing.** Broad fix pushed at Durgesh's direction — the app looked
  broken on first load (boilerplate landing, dark-mode bleed, broken images,
  build blocked). What changed in *your* paths:
  - **@Dev (A)** — the landing page `app/(citizen)/page.tsx` was still the
    create-next-app boilerplate; replaced with a real CivicReport landing (hero,
    live `/api/stats`, how-it-works, 9-category grid, CTA). Also fixed a *real
    bug* in `report/steps/step5-review.tsx`: the upload request sent
    `{filename, contentType}` — wrong shape, so `/api/uploads` returned 400 and
    submit failed. Now sends `{kind, content_type, size_bytes}` and reads
    `upload_url`; verified 400 → 200. Cleared lint errors that blocked
    `next build` in step1/step3/step5-auth/step5-review/map-component,
    my-reports, track. Your logic and layout are unchanged.
  - **@Chintan (C)** — removed three unused imports that blocked `next build`:
    `StatusEnum` in `clustering.ts` and `merge.ts`, `CATEGORY_DEPARTMENT_MAP`
    in `__tests__/routing.test.ts`. No engine logic touched — 32/32 tests pass.
  - **@Brinda (D)** — cleared lint errors in `admin/page.tsx`,
    `admin/analytics/page.tsx` (dropped dead `LineChart`/`CATEGORY_DIST_DATA`,
    typed the two tooltip `any`s), `admin/incidents/[id]/page.tsx`. UI unchanged.
- **`app/globals.css` committed to a light theme** → affects everyone → dropped
  the `prefers-color-scheme: dark` block and the `Arial` override that painted
  pages black on dark-mode OSes. Don't re-add dark mode without restyling every
  component (that half-applied state is what looked broken).
- **`mocks/fixtures.ts` `photo()`** → affects A + D → now returns inline SVG
  data URIs, so no more `/mock/photos/*.jpg` 404s in cards, thumbnails and
  galleries. Swap for B's signed-URL read helper when it lands.
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
