# 001 — Shared context protocol

**Status:** Accepted · **Date:** 2026-08-22

## Problem

Five people, five different AI coding tools, one repo. Each agent starts every
session blind to what the other four built since the last pull, so it re-derives
context, duplicates work, and edits files someone else is mid-way through.

## Decision

Each person's agent maintains one status file in `.claude/status/`. Everyone
pulls; every agent reads all five before starting work. `AGENTS.md` at the repo
root carries the orientation, because that is the file Claude Code, Antigravity,
and Cursor all load.

Three constraints make it survive:

**One writer per file.** Git conflicts are per-file. Five people appending to a
shared status file conflict on every pull, and people resolve those with
`git checkout --theirs`, which silently destroys context. Disjoint files merge
cleanly, always. Same reason decisions are one file each rather than one log.

**Requests live in the requester's file,** under "I need from you". Writing into
a teammate's file to ask them for something reintroduces the conflict this whole
design exists to avoid.

**`/sync` stages `.claude/` only.** Never `git add -A`. A context-sharing command
that can commit source code will eventually push someone's half-finished
refactor.

## Rejected

- **Shared `STATUS.md`** — the obvious design, and the one that fails on day two.
- **Wiki / Notion** — outside git, so it drifts from the code and no agent reads it.
- **Auto-sync on a timer** — produces "still working on it" fourteen times a day.
  Sync at checkpoints instead.

## Consequence

The status files are load-bearing. A stale one is worse than an absent one,
because teammates' agents will act on it. Hence `last_sync` and `head` in every
header, and `[STALE]` flagging in `/standup`.
