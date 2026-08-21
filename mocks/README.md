# The mock layer

This is what makes independent work real. A and D build the whole citizen app
and the whole admin dashboard against these handlers and never wait on B. When
the real routes land, one env flag flips and nothing else changes.

Owner: **E**. If a mock is wrong, tell E — do not patch it in your own branch,
because the next person to pull gets your fix and loses theirs.

## Turning it on

```bash
# once per clone — writes the service worker into public/
npx msw init public/ --save
```

`.env.local`:

```
NEXT_PUBLIC_USE_MOCKS=true
```

Then, in a client component mounted high in the tree:

```ts
if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
  const { startMocks } = await import('@/mocks/browser')
  await startMocks()
}
```

Set the flag to `false` to hit B's real API. That is the whole switch.

## What is mocked

| Endpoint | Notes |
|---|---|
| `POST /api/uploads` | Returns a presigned URL; the PUT to it is swallowed so the progress bar completes offline |
| `POST /api/reports` | Runs a crude same-category radius match so the confirmation screen exercises both the clustered and not-clustered branches |
| `GET /api/my-reports` | Cursor paged |
| `GET /api/reports/:id` | Full status timeline |
| `POST /api/reports/:id/verify` | Counts the vote; crossing 40% not-fixed flips the incident to `REOPENED` |
| `GET /api/incidents` | Filters, four sorts, cursor paging |
| `GET /api/incidents/:id` | Includes `priority_breakdown` |
| `PATCH /api/incidents/:id` | Rejects illegal status transitions and refuses `RESOLVED` without a resolution photo |
| `POST /api/incidents/merge` | |
| `GET /api/stats` | Landing page counters |

State is mutable within a session and resets on reload: submit a report and the
counter moves, assign an incident and the queue reflects it.

## Contract conformance

```bash
npm run verify:mocks
```

Every fixture is parsed through the real Zod schema it claims to satisfy, and
every handler validates its own response on the way out. A mock that drifts from
a contract fails here, loudly, instead of at 3 AM on submission day.

The invariant checks are worth knowing about, because they encode product rules
rather than types: the breakdown terms have to sum to the total, a `RESOLVED`
incident always has a resolution photo, and the queue is always ranked by score
descending.

## What this is not

Not the seed script. `scripts/seed.ts` writes 500 reports into real Postgres and
is what C's clustering and the priority cron actually run against. These fixtures
never touch a database and exist only so the UI can be built with the API off.
