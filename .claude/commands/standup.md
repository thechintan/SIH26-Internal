---
description: Summarize where all five workstreams stand
---

Read every file in `.claude/status/` (skip `_TEMPLATE.md`). Produce, and change
nothing on disk:

**Where everyone is** — one line each: stream, name, what shipped most recently,
what they are on now. Flag anyone whose `last_sync` is over 12 hours old as
`[STALE]`; their "In flight" cannot be trusted.

**Blocked** — every unresolved "I need from you" across all five files, grouped
by *who owes it*, so each person sees their queue in one place. If a request has
been sitting more than a day, mark it.

**Collision risk** — any two people whose "In flight" or "Owns" entries touch the
same path. This is the section worth being paranoid in; a collision found here
costs a conversation, and found at merge time it costs an evening.

**Drift** — anything in the status files that contradicts
`.claude/context/ENUMS.md` or an accepted file in `.claude/decisions/`.

If the whole team is unblocked and nothing collides, say that in two lines. Do
not manufacture concern to fill sections.
