---
owner: Chintan
workstream: C engine
last_sync: 2026-08-22T05:40:00+05:30
head: 051807f
---

# C engine — Chintan

## Owns
Clustering, priority scoring, routing, recurrence detection, incident merge logic. `lib/engine/**`.

## Shipped
Works, tested (32 passing unit tests), safe for others to build on.
- Engine types & PriorityBreakdown shape — [`lib/engine/types.ts`](file:///d:/SIH26-Internal/lib/engine/types.ts)
- Category severity default table & lookup — [`lib/engine/severity.ts`](file:///d:/SIH26-Internal/lib/engine/severity.ts)
- Priority scoring formula ($P = w_1 S_{cat} + w_2 \ln(1+N) + w_3 D_{open} + w_4 B_{recur}$) & tier mapping — [`lib/engine/priority.ts`](file:///d:/SIH26-Internal/lib/engine/priority.ts)
- Deterministic routing rules ($category \rightarrow department$) — [`lib/engine/routing.ts`](file:///d:/SIH26-Internal/lib/engine/routing.ts)
- Pure clustering decision logic & adaptive radius ($R = 35 + \text{gps\_accuracy}$) — [`lib/engine/clustering.ts`](file:///d:/SIH26-Internal/lib/engine/clustering.ts)
- Recurrence chain analysis & bonus ($B_{recur} = 2$) — [`lib/engine/recurrence.ts`](file:///d:/SIH26-Internal/lib/engine/recurrence.ts)
- Merge incidents validation & centroid recalculation — [`lib/engine/merge.ts`](file:///d:/SIH26-Internal/lib/engine/merge.ts)
- Complete unit test suite (32 tests in Vitest) — [`lib/engine/__tests__/**`](file:///d:/SIH26-Internal/lib/engine/__tests__)

## In flight
- PostGIS database integration (`ST_DWithin`, `ST_Distance`) — waiting on Person B's schema & seed data.

## I need from you
- **@Person B** — Supabase PostGIS schema & 500 synthetic seeded reports. Blocks: real PostGIS spatial queries and live DB priority scoring cron job.
- **@Person E** — Frozen Zod contracts in `lib/contracts/`. Once landed, we will align `lib/engine/types.ts` imports with shared contracts.

## Heads up
- Added minimal `package.json`, `tsconfig.json`, `vitest.config.ts` at root to allow pure TypeScript engine development and testing with Vitest. Will seamlessly absorb Next.js dependencies when Person E / B bootstrap the web framework.
- Defined `PriorityBreakdown` contract in [`lib/engine/types.ts`](file:///d:/SIH26-Internal/lib/engine/types.ts) for **Person D** to render in the Admin incident detail panel.

## Notes for my own agent
- PRD §7 worked examples verified: Pothole ($S=6, N=12, D=3, B=0$) evaluates to exactly $12.63$ (Medium), and Streetlight ($S=2, N=1, D=1, B=0$) evaluates to $3.89$ (Low).
- Priority tiers calibrated: Critical $\ge 20$, High $\ge 14$, Medium $\ge 8$, Low $< 8$.
- All engine modules are pure TypeScript functions. PostGIS geospatial queries are designed to slot in via candidate queries once the database layer is live.
