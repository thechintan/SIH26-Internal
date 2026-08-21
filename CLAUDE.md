@AGENTS.md

Claude-specific note: the commands in `.claude/commands/` (`/sync`, `/standup`,
`/handoff`) are the intended interface to the shared-context system. Prefer them
over hand-editing status files — they keep `last_sync` and `head` honest, and
`/sync` is scoped so it cannot commit source code by accident.
