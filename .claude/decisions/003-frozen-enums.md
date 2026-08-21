# 003 — Freeze the enums

**Status:** 🟡 Proposed — needs all five to agree · **Raised:** 2026-08-22

## Why this is a decision and not a detail

PRD §11 names three things that must be agreed before anyone writes feature code,
and this is the first. `category`, `status`, `department`, `severity` appear in
all five workstreams. Changing one on day two breaks four people simultaneously,
and the breakage is silent — a mismatched string enum fails at runtime, not at
compile time.

Tables live in `.claude/context/ENUMS.md`. This file records what was decided and
why.

## Proposed

**Category: 9 members.** The PRD gives three different, non-matching category
lists (§7 severity table, §9.3 tile grid, and the implied schema enum). Reconciled
into one set, with two additions:

- **`STRUCTURAL` added.** §7 scores bridge/structural damage at 10 — the highest
  severity in the product — but §9.3 has no tile for it. As written, the most
  dangerous category lands in `OTHER`: worst routing, lowest score. Also makes
  the tile grid 3×3 rather than 4×2, which is better on a phone.
- **`FOOTPATH` and `ELECTRICAL` get enum members.** Tiles in §9.3 with no entry
  anywhere else.

**Status: 9 members** — the PRD's seven plus `VERIFIED` and `REOPENED`.

PRD §9.4 calls the citizen "was this actually fixed?" prompt load-bearing:
without it, departments close tickets without doing the work and the analytics
become fiction. Two real states rather than a boolean makes the audit trail
readable, and reopen-rate-per-department — a quality signal the PRD asks for in
§10.7 — falls straight out of `status_history` with no extra modelling.

**Priority tiers: 20 / 14 / 8.** Not the round-looking 40 / 25 / 12. The PRD
formula's ceiling is 39.4, so a `CRITICAL` cutoff at 40 can never fire and the
demo dashboard shows nothing red. Working shown in `ENUMS.md`. Provisional until
re-checked against the seeded data.

## Open — decide these before freezing

1. **Stray animals.** A common civic complaint in Indian municipalities and a
   plausible SIH judging point; absent from the PRD entirely. Add
   `STRAY_ANIMAL`, or leave it to `OTHER`?
2. **Voice notes on reports.** Not in the PRD. Real accessibility win for
   low-literacy users, cheap to build (one field, one upload), and a strong
   talking point. In or out?
3. **Severity self-report.** Currently advisory and unused by the scorer. Either
   feed it in as a small weighted term or drop the field — collecting input that
   demonstrably does nothing is friction against the 45-second budget.

## Once accepted

Person E lands these as Zod schemas in `lib/contracts/` and generates the MSW
mocks from them. That is the day-1 unblock for A and D, per PRD §11.
