---
owner: Durgesh
workstream: E integration
last_sync: 2026-08-22T05:40:00+05:30
head: 8d4f56b
---

# E integration — Durgesh

## Owns
`lib/contracts/**`, `mocks/**`, `components/ui/**`, the daily merge to `main`,
the Vercel deploy, and the demo script.

Also running workstream **B** (see `b-backend.md`).

## Shipped
Works, pushed, safe for others to build on.

- **The enums are frozen.** `decisions/004` closes all three open questions from
  `003`; `context/ENUMS.md` is marked 🔒 FROZEN. Summary: no `STRAY_ANIMAL` (stays
  in `OTHER`, so the category count holds at 9 and the 3×3 tile grid works);
  voice notes out of v1 UI but `voice_note_url` is reserved in the contract as an
  optional field; severity self-report stays, advisory only, out of the scorer.
- **Frozen Zod contracts** — `lib/contracts/`. Import from `lib/contracts`, never
  from the individual files, and never redeclare an enum union in your own code.
  - `enums.ts` — the four frozen enums plus `STATUS_TRANSITIONS`, `canTransition()`,
    `CATEGORY_DEPARTMENT` (routing layer 1), `CATEGORY_SEVERITY_SEED`,
    `PRIORITY_WEIGHTS`, `priorityTier()`
  - `common.ts` — `GeoPoint`, cursor paging, the shared `ApiError` envelope
  - `report.ts` — `POST /api/reports`, `GET /api/my-reports`, `GET /api/reports/:id`,
    `POST /api/reports/:id/verify`
  - `upload.ts` — `POST /api/uploads` presigned upload
  - `incident.ts` — `GET /api/incidents`, `GET|PATCH /api/incidents/:id`,
    `POST /api/incidents/merge`, `GET /api/stats`, `PriorityBreakdownSchema`
- **MSW mocks for every endpoint** — `mocks/`. Setup in `mocks/README.md`.
  Handlers validate their own responses against the real schemas on the way out,
  so a drifted mock fails loudly instead of teaching you the wrong shape.
- **`mocks/verify.ts`** — parses every fixture through its contract and checks
  the product invariants (breakdown terms sum to the total, a `RESOLVED` incident
  always has a resolution photo, the queue is ranked by score descending). All
  green. Wire it up as `npm run verify:mocks` once `package.json` exists.

Verified: `tsc --strict` clean across `lib/` and `mocks/`, and the priority
formula reproduces all five sanity rows in `ENUMS.md` exactly (3.89 / 12.63 /
15.77 / 16.37 / 23.36) with a ceiling of 39.43.

## In flight
Started, not safe to depend on yet.
- shadcn/ui primitives in `components/ui/**` — waiting on A's scaffold to land so
  I install into his `package.json` rather than creating a competing one
- Vercel project + preview deploys — needs the human to link the account
- Demo script — after the first end-to-end merge

## I need from you
- **@Dev (A)** — three things, all small:
  1. Ack the enum decisions above. Your 3×3 grid is safe; category count is 9.
  2. When your scaffold lands, add these deps: `zod`, `msw` (dev),
     `@supabase/supabase-js`, `tsx` (dev). And these scripts:
     `"verify:mocks": "tsx mocks/verify.ts"`, `"seed": "tsx scripts/seed.ts"`.
     Tell me when it is pushed and I will take it from there.
  3. Run `npx msw init public/ --save` once — it writes the service worker the
     mock layer needs. It is a generated file, commit it.
- **@C** — the real `priority_breakdown` shape. Mine is marked PROVISIONAL in
  `incident.ts` and the mock generator computes the PRD §7 formula so D has
  something real to render. Replace it, do not run a second shape in parallel.
- **@D** — confirm cursor paging (`?cursor=&limit=`) for `GET /api/incidents`.
  It is what I froze; offset paging would shift rows under the reader every time
  the cron rewrites `priority_score`, which is every five minutes.

## Heads up
Things I changed that affect other people. Delete once everyone has pulled.
- **Enums frozen** (`decisions/004`, `ENUMS.md` marked FROZEN) → affects everyone
  → import from `lib/contracts`, and open a decision file before changing a member.
- **Contracts + MSW mocks landed** → affects A and D → you can build the full UI
  offline now. `mocks/README.md` has the two-line setup.
- **`address` added to `CreateReportRequestSchema`** (optional) → affects A →
  send a reverse-geocoded address with the report if you have one. Additive, so
  nothing breaks without it. Contracts stay additive-only from here.
- **`.claude/context/ENUMS.md` edited** (shared file) → affects everyone → pull
  before you touch it. Only the status header changed; no table was altered.

## Notes for my own agent

### Why E exists
PRD §14 names four-way integration failure as the top risk. E's job is the three
things PRD §11 says must exist before feature code: frozen enums, frozen Zod
contracts, MSW mocks generated from them. Plus the daily merge to `main`.

### Contract discipline
- Additive-only once published. Adding an optional field is free; renaming or
  removing one breaks four people at runtime, because a mismatched string enum is
  not a compile error.
- One definition per enum, in `enums.ts`. If you find a category union declared
  anywhere else, delete it.
- Mocks are generated from schemas, never hand-written to match them.

### Findings worth keeping
- The first fixture generator drew report counts uniformly and produced 23 of 60
  incidents CRITICAL with zero LOW. Real report volume is long-tailed — most
  incidents have one or two reporters, a handful go viral — so the generator now
  cubes the random draw. Spread is 6 / 22 / 26 / 6, which is a dashboard that
  looks like a real queue. **The same trap applies to the seeded data**: if the
  500 seeded reports come out mostly CRITICAL, suspect the distribution before
  suspecting the thresholds.
- Tier thresholds (20 / 14 / 8) are still PROVISIONAL by `003` and excluded from
  the freeze. Re-check them once the seed has actually run.
- `CITY` in `mocks/fixtures.ts` and `CITY` in `scripts/seed.ts` are two copies of
  the same constant. Change one, change the other, or the mock map and the seeded
  map show different cities mid-demo.

### Danger zones
- Only `b-backend.md` and `e-integration.md` are mine to write.
- Never touch `app/(citizen)/**`, `app/report/**`, `app/my-reports/**`,
  `app/track/**`, `lib/engine/**`, `app/admin/**`, `app/field/**`.
- `components/ui/**` is shadcn primitives only. A and D compose their own screens.
- `/sync` stages `.claude/` only. Never `git add -A`.
