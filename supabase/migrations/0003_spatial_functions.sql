-- ============================================================================
-- 0003_spatial_functions — spatial primitives and rate limiting
--
-- Owner: B (backend).
--
-- Boundary note for C: these are primitives, not the clustering engine. This
-- file answers "what open incidents of this category are within R metres" and
-- "what is the mean of these points". The decisions — whether to join or seed,
-- how the radius adapts, when a recurrence chain starts, what the priority
-- score is — live in lib/engine and belong to C. Keeping the PostGIS in SQL and
-- the policy in TypeScript means C can unit-test the engine without a database
-- round trip for every case.
-- ============================================================================

-- ── Clustering lookup ───────────────────────────────────────────────────────
-- Step 3 of PRD §6: nearest open incident of the same category inside the
-- adaptive radius.
--
-- Two rules are baked in here because getting either wrong is silent and
-- expensive:
--   Never match across categories. A pothole and a broken streetlight on one
--   corner are two incidents — correct, not a bug.
--   Never match into a closed incident. PRD §6 says create a new one and set
--   previous_incident_id, which is what makes recurrence chains detectable at all.

create or replace function public.find_nearby_open_incident(
  p_category  category_enum,
  p_lat       double precision,
  p_lng       double precision,
  p_radius_m  double precision
)
returns table (
  incident_id uuid,
  distance_m  double precision,
  status      status_enum,
  report_count int
)
language sql
stable
as $$
  select
    i.id,
    st_distance(i.centroid, st_point(p_lng, p_lat)::geography),
    i.status,
    i.report_count
  from public.incidents i
  where i.category = p_category
    and i.status not in ('RESOLVED', 'VERIFIED', 'REJECTED', 'DUPLICATE')
    and st_dwithin(i.centroid, st_point(p_lng, p_lat)::geography, p_radius_m)
  order by i.centroid <-> st_point(p_lng, p_lat)::geography
  limit 1;
$$;

-- ── Closed-incident lookup, for recurrence chains ───────────────────────────
-- When nothing open matches, the same location may still have failed before.
-- A wider radius on purpose: a pothole patched last monsoon and reopening now
-- is the same infrastructure failure even if the centroid moved ten metres.

create or replace function public.find_previous_closed_incident(
  p_category  category_enum,
  p_lat       double precision,
  p_lng       double precision,
  p_radius_m  double precision
)
returns uuid
language sql
stable
as $$
  select i.id
  from public.incidents i
  where i.category = p_category
    and i.status in ('RESOLVED', 'VERIFIED')
    and st_dwithin(i.centroid, st_point(p_lng, p_lat)::geography, p_radius_m)
  order by i.resolved_at desc nulls last
  limit 1;
$$;

-- ── Centroid recomputation ──────────────────────────────────────────────────
-- Step 4 of PRD §6: the incident centroid is the mean of its member reports, so
-- it drifts toward wherever people are actually standing rather than staying
-- pinned to whoever happened to report first.

create or replace function public.recompute_centroid(p_incident_id uuid)
returns void
language sql
as $$
  update public.incidents i
     set centroid = sub.centroid,
         updated_at = now()
    from (
      select st_centroid(st_collect(r.location::geometry))::geography as centroid
      from public.reports r
      where r.incident_id = p_incident_id
    ) sub
   where i.id = p_incident_id
     and sub.centroid is not null;
$$;

-- ── Ward assignment ─────────────────────────────────────────────────────────

create or replace function public.ward_for_point(
  p_lat double precision,
  p_lng double precision
)
returns uuid
language sql
stable
as $$
  select w.id
  from public.wards w
  where st_covers(w.geometry, st_point(p_lng, p_lat)::geography)
  limit 1;
$$;

-- ── Rate limiting ───────────────────────────────────────────────────────────
-- PRD §7: max 10 reports per user per hour. Counted in the database rather than
-- in memory because serverless functions do not share state between invocations
-- — an in-process counter on Vercel limits nothing at all.

create or replace function public.report_count_last_hour(p_user_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.reports
  where user_id = p_user_id
    and created_at > now() - interval '1 hour';
$$;

-- ── Public counters ─────────────────────────────────────────────────────────
-- The landing page counter (PRD §9.1). One round trip, no auth.

create or replace function public.public_stats()
returns table (
  reports_total   bigint,
  incidents_total bigint,
  resolved_total  bigint
)
language sql
stable
as $$
  select
    (select count(*) from public.reports),
    (select count(*) from public.incidents),
    (select count(*) from public.incidents where status in ('RESOLVED', 'VERIFIED'));
$$;
