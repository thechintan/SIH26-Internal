---
description: Pull teammates' context, rewrite my status file, push it
---

Sync my shared context with the team. My status file is the one in
`.claude/status/` whose `owner` matches me — if you cannot tell which is mine,
ask before writing anything.

**1. Pull.**
`git pull --rebase`
If this conflicts on anything under `.claude/status/`, the single-writer rule has
been broken — two people wrote the same file. Stop and tell me; do not resolve it
yourself.

**2. Read the other four status files.** Summarize for me in under 15 lines:
- what shipped since my last sync
- anything newly listed under "I need from you" that is addressed to me
- any "Heads up" entry touching a path I own
Lead with whatever blocks me. If nothing does, say so in one line — do not pad.

**3. Rewrite my status file only.**
- `last_sync` = now (ISO 8601), `head` = `git rev-parse --short HEAD`
- Rebuild "Shipped" and "In flight" from `git log` for my commits since the old
  `last_sync`, plus the current working tree and my todo state
- Carry forward unresolved "I need from you" items; **drop any that a teammate's
  status now shows as shipped**
- Drop "Heads up" entries older than ~24h — everyone has pulled by then
- Leave "Notes for my own agent" alone unless I learned something worth adding

**4. Stage context files only.**
`git add .claude/status/<mine>.md .claude/decisions/`
Never `git add -A`, never `git add .`, never stage source files. If I have
uncommitted feature work, leave it exactly as it is — this command exists to
share context, not to ship code.

**5. Commit and push.** Message: `context: sync <stream> — <one-line summary>`.
Then tell me in one line what you pushed and what I should look at first.
