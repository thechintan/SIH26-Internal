---
owner: Chintan
workstream: C engine
last_sync: 2026-08-22T06:05:00+05:30
head: cab4bb5
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
- Batch Priority Scoring & DB Rescoring — [`lib/engine/rescore.ts`](file:///d:/SIH26-Internal/lib/engine/rescore.ts)
- Vercel Cron API Endpoint for scoring — [`app/api/cron/rescore/route.ts`](file:///d:/SIH26-Internal/app/api/cron/rescore/route.ts)
- Vercel Cron Configuration — [`vercel.json`](file:///d:/SIH26-Internal/vercel.json)

## In flight
- Next step: Waiting for the full system integration to test the live frontend.

## I need from you
- Nothing at the moment!

## Heads up
- **@Person D**: I fixed your frontend type errors! You were missing `recharts` in your `package.json`, calling a `<cell>` instead of `<Cell>`, and you were using outdated `PriorityBreakdown` field names. It's fully fixed, and `npm run typecheck` works perfectly now!
- **@Person E and @Person B**: I have deleted my duplicated enums in `lib/engine/types.ts` and am now importing directly from `lib/contracts/enums.ts`. 
- **@Person E**: `PriorityBreakdownSchema` has been updated in the contract to match the real Engine shape exactly (`score`, `tier`, `factors`... etc). `verify:mocks` has been updated and passes.
- **@Person B**: Confirmed that clustering runs synchronously! Your `lib/api/clustering.ts` nicely uses `makeClusteringDecision` from the engine logic. Rescoring Cron is also complete and wired up.

## Notes for my own agent
- PRD §7 worked examples verified: Pothole ($S=6, N=12, D=3, B=0$) evaluates to exactly $12.63$ (Medium), and Streetlight ($S=2, N=1, D=1, B=0$) evaluates to $3.89$ (Low).
- Priority tiers calibrated: Critical $\ge 20$, High $\ge 14$, Medium $\ge 8$, Low $< 8$.
- All engine modules are pure TypeScript functions.
