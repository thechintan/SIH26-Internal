# Enums

PRD §11 rule 1: freeze these before anyone writes feature code. All five
workstreams import them, so a later change breaks four people at once.

**Status: 🔒 FROZEN** — ratified by `decisions/004`, which closed the three open
questions in `003`. Changing any member below now requires a new decision file.
Canonical definition lives in `lib/contracts/enums.ts`; nobody redeclares these.

One exception: the **priority tier thresholds** are still provisional and are not
part of the freeze — `003` requires re-checking them against the 500 seeded
reports, which do not exist yet.

## Category — 9 members

| Enum | UI tile | S_cat | Routes to |
|---|---|---|---|
| `STRUCTURAL` | Bridge / structure | 10 | Public Works |
| `ELECTRICAL` | Exposed wiring | 9 | Electrical |
| `DRAIN_MANHOLE` | Drain / Manhole | 9 | Water & Drainage |
| `WATER_LEAK` | Water leak | 7 | Water & Drainage |
| `POTHOLE` | Pothole | 6 | Public Works |
| `FOOTPATH` | Footpath | 4 | Public Works |
| `GARBAGE` | Garbage | 3 | Sanitation |
| `STREETLIGHT` | Streetlight | 2 | Electrical |
| `OTHER` | Other | 2 | Triage queue |

Two deliberate departures from a literal reading of the PRD:

**`STRUCTURAL` is added.** The PRD's severity table (§7) scores "Bridge /
structural damage" at 10 — its highest — but §9.3's tile grid omits it entirely.
Left as written, the most dangerous category falls into `OTHER`, which routes
worst and scores lowest. Adding it also makes the grid 3×3, which lays out better
on a phone than 4×2.

**`FOOTPATH` and `ELECTRICAL` get enum members.** They are tiles in §9.3 with no
corresponding entry anywhere else in the PRD.

Severity lives in a `category_severity` table, not in code — PRD §7 is explicit
that municipalities weight differently and it must be editable in admin settings.
The values above are the seed row.

## Status — 9 members

`SUBMITTED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED → VERIFIED`
plus `REOPENED`, `REJECTED`, `DUPLICATE`.

| Transition | Trigger |
|---|---|
| `SUBMITTED → ACKNOWLEDGED` | auto, on routing |
| `ACKNOWLEDGED → ASSIGNED` | admin assigns a crew |
| `ASSIGNED → IN_PROGRESS` | field staff starts |
| `IN_PROGRESS → RESOLVED` | field staff uploads resolution photo (mandatory) |
| `RESOLVED → VERIFIED` | citizen confirms the fix |
| `RESOLVED → REOPENED` | citizen says not fixed, or >40% of reporters do |
| `REOPENED → ASSIGNED \| IN_PROGRESS` | admin re-dispatches |
| `* → REJECTED \| DUPLICATE` | admin, terminal |

`VERIFIED` and `REOPENED` beyond the PRD's seven: PRD §9.4 calls the citizen
"was this actually fixed?" prompt load-bearing — without it departments can close
tickets without doing the work and the analytics become fiction. Modelling that
as two real states rather than a boolean makes the audit trail readable and lets
reopen-rate-per-department fall straight out of the status history.

## Priority tiers — recalibrate, do not guess

Score bands for UI colour only. The score itself is the ranking.

| Tier | Band |
|---|---|
| `CRITICAL` | ≥ 20 |
| `HIGH` | ≥ 14 |
| `MEDIUM` | ≥ 8 |
| `LOW` | < 8 |

**Why not round numbers like 40/25/12.** The PRD formula is
`P = S_cat + 2·ln(1+N) + 0.5·D_open + B_recur`. Its absolute ceiling — worst
category, 500 unique reporters, 30 days open, recurring — is:

```
10 + 2·ln(501) + 0.5·30 + 2  =  10 + 12.4 + 15 + 2  =  39.4
```

Anything with a `CRITICAL` cutoff at 40 can never fire. The PRD's own worked
examples score 12.63 and 3.89. Pick thresholds above the formula's real range and
the demo dashboard is a wall of grey with nothing ever red.

Sanity checks against the bands above:

| Scenario | Score | Tier |
|---|---|---|
| Streetlight, 1 reporter, 1 day | 3.89 | LOW |
| Pothole, 12 reporters, 3 days | 12.63 | MEDIUM |
| Garbage, 3 reporters, **20 days** | 15.77 | HIGH |
| Electrical, 30 reporters, 1 day | 16.37 | HIGH |
| Structural, 50 reporters, 7 days, recurring | 23.36 | CRITICAL |

The garbage row is the aging term working as designed — a minor issue left open
three weeks should outrank a fresh moderate one. That is PRD §7's anti-starvation
argument, and it is worth pointing at during the demo.

**These are still provisional.** Re-check them against the 500 seeded reports
once they exist. Thresholds set against imagined data are a guess with a table
around it.

## Roles

`CITIZEN` · `FIELD_STAFF` · `DEPT_HEAD` · `SUPER_ADMIN`

Enforced with Supabase Row Level Security, not UI hiding. PRD §10.1.

## Departments

`SANITATION` · `PUBLIC_WORKS` · `ELECTRICAL` · `WATER_DRAINAGE`

## Severity self-report

`MINOR` · `MODERATE` · `SEVERE` — the citizen's own read, PRD §9.3 step 4.
Advisory only; it does not feed the priority score.
