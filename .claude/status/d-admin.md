---
owner: Brinda
workstream: D admin
last_sync: 2026-08-22T05:34:00+05:30
head: c3e5fd9
---

# D admin — Brinda

## Owns
`app/admin/**`, `app/field/**`

## Shipped
Works, pushed, safe for others to build on.
- Admin layout shell (`app/admin/layout.tsx`) — sidebar nav, responsive collapse
- Command Center split view (`app/admin/page.tsx`) — ranked queue + Leaflet map
- Incident detail page (`app/admin/incidents/[id]/page.tsx`) — priority breakdown panel, photo gallery, status transitions, Leaflet map
- Field staff view (`app/field/page.tsx`, `app/field/[id]/page.tsx`) — mobile-first, mandatory resolution photo
- Analytics Dashboard (`app/admin/analytics/page.tsx`) — Recharts integration
- Settings Page (`app/admin/settings/page.tsx`) — Severity weight configuration

## In flight
Started, not safe to depend on yet.
- *(all Session 1 tasks complete)*

## I need from you
- **@Durgesh (E)** — shadcn/ui primitives in `components/ui/` (Table, Dialog, Select, Button, Badge, DropdownMenu). Blocks: polished queue and detail page. Will use raw Tailwind until these land.
- **@Durgesh (B)** — real API endpoints for `GET /api/incidents`, `GET /api/incidents/:id`, `PATCH /api/incidents/:id`. Not blocking — MSW mocks are fully covering me.
- **@Durgesh (E)** — Note: the production build is currently failing due to a type error in `mocks/handlers.ts` on line 61 (`output<T>` not assignable to `JsonBodyType`). This is an MSW + Zod type incompatibility. The dev server works fine.

## Heads up
Things I changed that affect other people. Delete once everyone has pulled.
- **Cursor paging confirmed** → affects E (Durgesh) → cursor paging (`?cursor=&limit=`) is correct for `GET /api/incidents`. Offset paging would shift rows every 5 min when cron rewrites `priority_score`. Confirmed, no change needed.

## Notes for my own agent

### Session 1 context (2026-08-22)
- Repo pulled at `c3e5fd9`. Next.js scaffold exists (by Dev/A). Contracts + MSW mocks shipped (by Durgesh/B+E).
- All admin paths (`app/admin/**`, `app/field/**`) are empty — building from scratch.
- C (engine) is UNCLAIMED. The `PriorityBreakdownSchema` in `lib/contracts/incident.ts` is PROVISIONAL (E's proposal, not C's). Building against it — shape matches PRD §7 formula exactly.
- Priority tier thresholds (20/14/8) are PROVISIONAL — excluded from the enum freeze. Using for badge colours; may shift after seed data check.
- shadcn/ui components not yet in `components/ui/` — E is waiting on A's scaffold to install them. Using Tailwind directly for now.

### Critical rules to remember
- Admin queue shows **incidents**, NEVER raw reports. 50 citizens photographing one pothole = 1 queue row.
- Individual reports appear ONLY inside incident detail — photo gallery + scatter overlay, not work units.
- The **priority breakdown panel is non-negotiable** (PRD §10.4). Without it admins distrust the ranking.
- Status transitions must respect `canTransition()` from `lib/contracts/enums.ts`. Grey out illegal moves.
- `RESOLVED` requires a `resolution_photo_url` — proof of work. The DB trigger enforces this too.
- Never compute priority score on page load. It's a cron job result — just read `priority_score` and `ORDER BY DESC`.
- `report_count` is unique users from `incident_reporters`, never a raw row count.
- Use the word "incident" in admin UI. Never "report", "ticket", "issue", "complaint", or "case".

### Danger zones
- Do NOT import from discarded `admin-portal/` (Vite+React, no incidents model) — decisions/002.
- Do NOT touch: `app/(citizen)/**`, `app/report/**`, `app/my-reports/**`, `app/track/**`, `app/api/**`, `supabase/**`, `lib/engine/**`, `lib/contracts/**`, `mocks/**`
- Shared files needing Heads Up: `package.json`, `tailwind.config.ts`, `next.config.mjs`, `.claude/context/*`

### Enums I consume (frozen — changing requires a decision file)
- **Category (9):** STRUCTURAL, ELECTRICAL, DRAIN_MANHOLE, WATER_LEAK, POTHOLE, FOOTPATH, GARBAGE, STREETLIGHT, OTHER
- **Status (9):** SUBMITTED, ACKNOWLEDGED, ASSIGNED, IN_PROGRESS, RESOLVED, VERIFIED, REOPENED, REJECTED, DUPLICATE
- **Department (4):** SANITATION, PUBLIC_WORKS, ELECTRICAL, WATER_DRAINAGE
- **Role (4):** CITIZEN, FIELD_STAFF, DEPT_HEAD, SUPER_ADMIN
- **Priority tier (4):** LOW (<8), MEDIUM (≥8), HIGH (≥14), CRITICAL (≥20) — PROVISIONAL thresholds

### Phase plan
1. ✅ Contracts + mocks (done by E)
2. → Queue + map (Command Center) ← CURRENT
3. Incident detail + assignment
4. Analytics dashboard
5. Demo polish + responsive testing
