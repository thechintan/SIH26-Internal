# The shared-context system

Five people, five agents, one repo. This folder is how they stay aware of each
other without a standing meeting.

## How it works

Each person's agent maintains **one status file** describing that person's work.
Everyone pulls, so every agent starts each session having read what the other
four are doing. That is the whole mechanism.

```
.claude/
├── README.md            you are here
├── settings.json        shared permissions (checked in)
├── commands/            /sync, /standup, /handoff
├── context/             slow-moving: PRD, glossary, enums
├── status/              ONE FILE PER PERSON — single writer each
└── decisions/           one file per decision, never a shared log
```

## The three rules

**1. One writer per file.** You write `status/<your-stream>.md` and nothing else
under `status/`. Git conflicts are per-file; disjoint files merge cleanly every
time. This is the rule that makes the system survive past day two.

**2. Requests go in your own file.** Blocked on someone? Put it under "I need
from you" in *your* status, tagged with their name. They will read it on their
next `/sync`. Editing their file to add your request breaks rule 1.

**3. `/sync` never commits source code.** It stages `.claude/` and nothing else.
If it ever runs `git add -A`, someone pushes a half-finished refactor at 3 AM.

## When to sync

At natural checkpoints — you finished a thing, you got blocked, you changed
something that affects someone else. Not on a timer. A status file that says
"working on it" fourteen times a day is noise.

Always sync before you sleep. The overnight gap is when stale context does the
most damage.

## Keeping the files honest

The top five sections are a **contract** — other people's agents read them, so
keep them tight and current. "Notes for my own agent" at the bottom is yours;
put the deep context there — gotchas you hit, why you chose something, what you
tried that failed. Teammates' agents will read it too, which is the point, but
it is the section to trim first if the file gets unwieldy.

Dead entries are worse than missing ones. If "I need from you" lists something a
teammate already shipped, delete it — `/sync` does this automatically by
cross-checking their status.

## For teammates on Antigravity / Cursor

Your tool reads `AGENTS.md` at the repo root, not `CLAUDE.md`. That file carries
the full orientation and tells your agent to read `.claude/status/` first. If
your tool supports custom commands, port `.claude/commands/sync.md` — it is
plain prose, not Claude-specific syntax.
