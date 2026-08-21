---
description: Ask a teammate for something, without touching their file
---

I need something from a teammate: **$ARGUMENTS**

Add it under **"I need from you"** in *my own* status file, as:

`- **@name** — <what I need>. Blocks: <what of mine is stuck without it>.`

Be specific about the blocking consequence. "Need the seed script" is ignorable;
"need the seed script, my clustering tests cannot run without rows" is not.

**Do not edit their status file.** The single-writer rule is what keeps merges
conflict-free — a request written into someone else's file will collide with
their next `/sync` and one of you will lose work. They will see this on their
next pull.

Then run the `/sync` flow so it actually reaches them.
