---
owner: <your name>
workstream: <A citizen | B backend | C engine | D admin | E integration>
last_sync: <ISO 8601, set by /sync>
head: <short sha this file describes, set by /sync>
---

# <Stream> — <Name>

## Owns
`path/one/**`, `path/two/**`

## Shipped
Works, pushed, safe for others to build on.
- <thing> — `path/to/file.ts`

## In flight
Started, not safe to depend on yet.
- <thing> — expect by <when>

## I need from you
- **@name** — <what you need>. Blocks: <what of yours is stuck without it>.

## Heads up
Things I changed that affect other people. Delete once everyone has pulled.
- <what changed> → affects <who> → they must <do what>

## Notes for my own agent
Deep context: decisions made, gotchas found, dead ends already explored.
Teammates' agents read this too when working near my paths.
