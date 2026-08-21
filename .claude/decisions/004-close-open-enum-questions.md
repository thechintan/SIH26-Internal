# 004 — Close the three open questions in 003; freeze the enums

**Status:** 🟢 Accepted · **Decided:** 2026-08-22 by Durgesh (E)
**Supersedes:** the "Open — decide these before freezing" section of `003`.

## Why now

`003` left three questions open and marked the enums *proposed*. A (Dev) is
scaffolding the citizen app and his Step 2 tile grid cannot be laid out until the
category count is final — a 3×3 grid only works at exactly 9. PRD §11 rule 1 says
these are agreed *before* feature code. Deciding them is therefore the first
thing on the critical path, ahead of any schema or contract work.

## Decisions

### 1. `STRAY_ANIMAL` — **no.** Stays inside `OTHER`.

It is a real and common civic complaint, and the argument for adding it is
genuine. It loses on two counts:

- **Ownership is unresolved.** The four frozen departments are Sanitation, Public
  Works, Electrical, Water & Drainage. Stray animals belong to none of them —
  in most municipal structures this sits with a veterinary or public-health wing
  that does not exist in our model. Adding the category without a department to
  route it to means it lands in the triage queue, which is exactly where `OTHER`
  already puts it. Zero functional gain, one more enum member in five workstreams.
- **It breaks the 3×3 grid** A is building against, for no routing benefit.

Revisit if a fifth department is ever added. Until then `OTHER` → triage is the
honest representation.

### 2. Voice notes — **out of v1 UI, but the field is reserved.**

The accessibility argument from `002` is good and the SIH talking point is real.
It is still not free: recording UI, permissions, a second upload path, a player in
three surfaces. Against a 45-second friction budget on day 0, with three of five
workstreams blocked on contracts, it is not what to spend the hours on.

What we do instead: `voice_note_url` ships in the report contract **now**, as
`.nullable().optional()`. Contracts are additive-only once published, so a field
that exists from the start costs nothing and turning it on later is not a
breaking change. Building the UI later is a decision A can make on his own
schedule without a second decision file.

### 3. Severity self-report — **keep, advisory only. It does not feed the scorer.**

`003` framed it as "feed it in or drop it — collecting input that does nothing is
friction." The third option is the right one: it does not do nothing.

- It is one tap on an existing step, not a new step. The friction is ~2 seconds.
- It is the **only** citizen signal that is not derivable from category plus
  location. A `POTHOLE` reported as `SEVERE` by nine of twelve reporters is a
  different object from one reported `MINOR` by all twelve, and no other field
  captures that.
- It surfaces in the admin incident detail as reporter consensus, and it is a
  free candidate term for weight tuning in phase 5 against real data.

It stays **out of the priority formula** for v1. PRD §7's formula is what the
breakdown panel explains to admins, and adding an unvalidated self-reported term
to it would make the panel harder to defend, not easier. Tune it in later with
data, or never.

## Consequence — the enums are now frozen

`.claude/context/ENUMS.md` is ratified as written: **9 categories, 9 statuses,
4 departments, 4 roles, 3 severity levels, 4 priority tiers.** Its status line
moves from "proposed, awaiting team sign-off" to frozen.

From this point, changing any member requires a new decision file. E lands them
as `lib/contracts/enums.ts` — one definition, imported by all five workstreams.
Nobody redeclares a category union in their own file.

The priority tier thresholds (20 / 14 / 8) stay **provisional** and are excluded
from the freeze: `003` is explicit that they must be re-checked against the 500
seeded reports, and those do not exist yet. Re-checking them is B's follow-up
once `scripts/seed.ts` runs. Adjusting a threshold changes UI colour bands only —
it does not change a stored value or break an import.
