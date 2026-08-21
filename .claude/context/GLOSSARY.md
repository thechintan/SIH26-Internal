# Shared vocabulary

Use these exact words in code, in commits, in status files, in the pitch. When
four people say "ticket" and mean four different things, the integration fails
in conversation before it fails in git.

| Term | Means |
|---|---|
| **Report** | One citizen submission: photo(s), category, location, timestamp, optional text/voice |
| **Incident** | One real-world problem. Aggregates N reports of the same category at the same place |
| **Report count** | Number of **unique users** who reported an incident — not raw rows. Spam protection |
| **Priority score** | Numeric ranking of an incident, recomputed on a schedule, never on page load |
| **Priority tier** | Coarse band (low/medium/high/critical) derived from the score, for UI colour |
| **Department** | Sanitation · Public Works · Electrical · Water & Drainage |
| **Ward** | Municipal subdivision with polygon geometry; the unit for equity normalization |
| **Recurrence chain** | Incidents linked by `previous_incident_id` at one location — infrastructure failure, not a one-off |

## The distinction that matters most

**Citizens create reports. Admins act on incidents.**

Fifty people photographing one pothole must produce one row in the admin queue,
not fifty. If the admin dashboard ever shows raw reports as the primary work
unit, the product's core claim collapses — and so does the pitch.

The earlier build in this repo's history got this wrong — it linked duplicates
report-to-report and counted upvotes, and the admin queue showed raw reports.
That is why it was discarded (`.claude/decisions/002`). Do not reintroduce it.

## Terms to avoid

"Ticket", "issue", "complaint", "case" — all ambiguous between report and
incident. Say which one you mean.
