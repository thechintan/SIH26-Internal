# Database

Owner: **B**. Nobody else writes migrations. If you need a column, ask in your
status file under "I need from you" and B will add it — a second person editing
the schema is how you get two migrations that both claim to be `0004`.

## Migrations

| File | What |
|---|---|
| `0001_init.sql` | PostGIS, the four frozen enums, all nine tables, indexes, ticket IDs, the status-transition guard, unique-user report counting, reference seed rows |
| `0002_rls.sql` | Row Level Security for `CITIZEN` / `FIELD_STAFF` / `DEPT_HEAD` / `SUPER_ADMIN` |
| `0003_spatial_functions.sql` | Spatial primitives for clustering, rate-limit counter, public stats |

Apply them in order. Either paste them into the Supabase SQL editor, or:

```bash
supabase link --project-ref <ref>
supabase db push
```

## Seeding

```bash
npx tsx scripts/seed.ts --reset
```

Needs `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`. The service role key bypasses RLS, which is the
point of a seed script and also why it must never appear in a `NEXT_PUBLIC_*`
variable or in a client component.

500 reports land on eight weighted hotspots, so clustering has something real to
find. Expect a reports-per-incident ratio above 2.5× — that is PRD §13's
duplicate-reduction target, and the script warns if it comes in under.

Priority scores stay at 0 until the rescoring cron runs. That is correct, not a
bug: PRD §7 says the score is never computed on read.

## Two rules that are easy to break

**`report_count` is a count of distinct people**, maintained by a trigger from
`incident_reporters`. Never `count(*)` on reports — that is the number one
person can inflate by submitting ten times.

**Clustering never matches into a closed incident.** A new report at a location
that was already resolved seeds a fresh incident with `previous_incident_id`
set. That link is the entire recurrence-chain feature; matching into the old row
would erase it silently.

## Things enforced in the database, not just the API

The API is not the only writer — the cron, the seed script and any manual fix
all go through Postgres. So these live in triggers:

- Illegal status transitions are rejected (`0001`, mirrors `STATUS_TRANSITIONS`
  in `lib/contracts/enums.ts` — change one and you must change the other).
- `RESOLVED` without a `resolution_photo_url` is rejected. Proof of work.
- Only a `SUPER_ADMIN` can change a user's role or department posting.
- Every status change writes a `status_history` row automatically.
