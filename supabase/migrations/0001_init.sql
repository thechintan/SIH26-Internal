-- ============================================================================
-- 0001_init — schema, enums, PostGIS, indexes
--
-- Owner: B (backend). PRD §5.
--
-- The one thing to understand before editing: citizens create REPORTS, admins
-- act on INCIDENTS. One incident aggregates N reports of the same category at
-- the same place. The earlier build in this repo's history had no incidents
-- table — it linked report-to-report and counted upvotes — and that is why it
-- was discarded (decisions/002). Do not collapse these two tables.
-- ============================================================================

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ── Enums ───────────────────────────────────────────────────────────────────
-- Frozen by decisions/004. These must stay byte-identical to
-- lib/contracts/enums.ts — a mismatch fails at runtime, not at compile time.

create type category_enum as enum (
  'STRUCTURAL', 'ELECTRICAL', 'DRAIN_MANHOLE', 'WATER_LEAK', 'POTHOLE',
  'FOOTPATH', 'GARBAGE', 'STREETLIGHT', 'OTHER'
);

create type status_enum as enum (
  'SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED',
  'VERIFIED', 'REOPENED', 'REJECTED', 'DUPLICATE'
);

create type department_enum as enum (
  'SANITATION', 'PUBLIC_WORKS', 'ELECTRICAL', 'WATER_DRAINAGE'
);

create type role_enum as enum (
  'CITIZEN', 'FIELD_STAFF', 'DEPT_HEAD', 'SUPER_ADMIN'
);

create type severity_enum as enum ('MINOR', 'MODERATE', 'SEVERE');

-- ── Identity ────────────────────────────────────────────────────────────────
-- Mirrors auth.users. Supabase owns authentication; this table owns the role
-- and the department posting, which RLS reads on every request.

create table public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          role_enum       not null default 'CITIZEN',
  full_name     text,
  phone         text,
  -- Set for FIELD_STAFF and DEPT_HEAD; null for citizens and super admins.
  department    department_enum,
  created_at    timestamptz     not null default now()
);

create index on public.users (role);
create index on public.users (department) where department is not null;

-- ── Reference data ──────────────────────────────────────────────────────────

create table public.departments (
  code          department_enum primary key,
  name          text            not null,
  -- Hours from acknowledgement to expected resolution, per priority tier.
  sla_hours     int             not null default 72
);

-- Municipal subdivisions. The unit for equity normalization (PRD §7 edge case 4)
-- and for the analytics heat map.
create table public.wards (
  id            uuid primary key default gen_random_uuid(),
  -- Unique so the seed script can upsert on it and stay idempotent.
  name          text            not null unique,
  geometry      geography(Polygon, 4326),
  created_at    timestamptz     not null default now()
);

create index on public.wards using gist (geometry);

-- PRD §7 is explicit: severity is configuration, not code. Municipalities weight
-- differently and this must be editable from admin settings. The scorer reads
-- this table at runtime; it never hardcodes a number.
create table public.category_severity (
  category      category_enum primary key,
  severity      numeric(4,1)  not null check (severity >= 0 and severity <= 10),
  -- Layer 1 of the routing engine (PRD §8). Null routes to the triage queue.
  department    department_enum,
  updated_at    timestamptz   not null default now(),
  updated_by    uuid references public.users (id)
);

-- ── Incidents ───────────────────────────────────────────────────────────────
-- The admin work unit. One row per real-world problem.

create table public.incidents (
  id                    uuid primary key default gen_random_uuid(),
  category              category_enum   not null,
  centroid              geography(Point, 4326) not null,
  -- Plain lat/lng for the read path. geography(Point) is what the spatial
  -- queries need; it is not what a JSON response or a Leaflet marker wants, and
  -- an RPC per row to unpack it would be absurd. Generated and stored, so they
  -- can never drift from the centroid they came from.
  centroid_lat          double precision generated always as (st_y(centroid::geometry)) stored,
  centroid_lng          double precision generated always as (st_x(centroid::geometry)) stored,
  -- Reverse-geocoded on the client at report time and carried up to the
  -- incident. Denormalised on purpose: the admin queue renders an address on
  -- every row, and a geocode round trip per row would make the queue unusable.
  address               text,
  ward_id               uuid references public.wards (id),

  -- Unique reporters, maintained from incident_reporters. Never a row count on
  -- reports — that is the number a spammer can inflate for free.
  report_count          int             not null default 0,

  status                status_enum     not null default 'SUBMITTED',
  department            department_enum,
  assigned_to           uuid references public.users (id),
  sla_due_at            timestamptz,

  -- Written by the cron every 5 minutes, never computed on page load (PRD §7).
  priority_score        double precision not null default 0,
  -- Explains the score to admins. Shape is lib/contracts PriorityBreakdownSchema.
  priority_breakdown    jsonb,
  -- An admin pinned the score; the auto-scorer skips this row until cleared.
  manual_override       boolean         not null default false,

  -- True when any contributing report had the image model disagree with the
  -- citizen's category. Rolled up to the incident so the admin queue can filter
  -- on it without a subquery per row. Surfaced for review, never auto-applied.
  flagged_mismatch      boolean         not null default false,

  -- Recurrence chain. Set when a new report lands on a location whose previous
  -- incident was already closed. Three links deep means the infrastructure needs
  -- replacing, not patching.
  previous_incident_id  uuid references public.incidents (id),

  first_reported_at     timestamptz     not null default now(),
  resolved_at           timestamptz,
  -- Proof of work. Mandatory before status can reach RESOLVED; enforced in the
  -- transition trigger below, not only in the UI.
  resolution_photo_url  text,
  created_at            timestamptz     not null default now(),
  updated_at            timestamptz     not null default now()
);

-- ── Reports ─────────────────────────────────────────────────────────────────
-- The citizen submission. Many of these per incident.

create table public.reports (
  id                  uuid primary key default gen_random_uuid(),
  -- Human-facing short code. This is what the confirmation screen shows.
  ticket_id           text            not null unique,
  user_id             uuid            not null references public.users (id),
  -- Null only in the instant between insert and clustering.
  incident_id         uuid references public.incidents (id),

  category            category_enum   not null,
  photo_url           text            not null,

  -- PostGIS geography, not two float columns. The clustering query in PRD §6
  -- cannot exist without this.
  location            geography(Point, 4326) not null,
  -- Same reasoning as incidents.centroid_lat/lng: spatial type for the queries,
  -- plain numbers for the read path, generated so they cannot disagree.
  lat                 double precision generated always as (st_y(location::geometry)) stored,
  lng                 double precision generated always as (st_x(location::geometry)) stored,
  -- Browser GPS is materially worse than native. This drives the adaptive
  -- clustering radius: R = 35 + gps_accuracy_m.
  gps_accuracy_m      double precision not null default 0,
  -- Reverse-geocoded client-side (free via OSM Nominatim, no API key). Nullable
  -- because a citizen who denied location permission and dropped a pin manually
  -- may not have one, and the report is still valid without it.
  address             text,

  description         text check (char_length(description) <= 140),
  -- The citizen's own read. Advisory only — decisions/004 keeps this out of the
  -- priority formula. Displayed to admins as reporter consensus.
  severity_self       severity_enum   not null default 'MODERATE',
  -- Reserved by decisions/004. No UI in v1; present so enabling it later is not
  -- a breaking change.
  voice_note_url      text,

  -- Rate limiting signal alongside user_id (PRD §7: 10 reports/user/hour).
  device_fingerprint  text,

  -- Stretch: image model cross-check. On high-confidence disagreement we set
  -- flagged_mismatch and surface it for admin review rather than silently
  -- overriding what the citizen chose.
  predicted_category  category_enum,
  flagged_mismatch    boolean         not null default false,

  created_at          timestamptz     not null default now()
);

-- ── Unique-user counting ────────────────────────────────────────────────────
-- This join table exists for exactly one reason: report_count must be a count
-- of distinct people, so submitting the same pothole ten times cannot inflate a
-- priority score.

create table public.incident_reporters (
  incident_id   uuid not null references public.incidents (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  first_at      timestamptz not null default now(),
  primary key (incident_id, user_id)
);

-- ── Audit trail ─────────────────────────────────────────────────────────────
-- Every status change. Reopen-rate-per-department and time-to-acknowledge both
-- fall straight out of this with no extra modelling (PRD §10.7).

create table public.status_history (
  id            bigserial primary key,
  incident_id   uuid not null references public.incidents (id) on delete cascade,
  from_status   status_enum,
  to_status     status_enum not null,
  actor_id      uuid references public.users (id),
  note          text,
  at            timestamptz not null default now()
);

create index on public.status_history (incident_id, at);

-- ── Citizen verification ────────────────────────────────────────────────────
-- The "was this actually fixed?" vote (PRD §9.4). Without it a department can
-- close an incident without doing the work and the analytics become fiction.

create table public.report_verifications (
  report_id     uuid primary key references public.reports (id) on delete cascade,
  incident_id   uuid not null references public.incidents (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  fixed         boolean not null,
  note          text,
  at            timestamptz not null default now()
);

create index on public.report_verifications (incident_id);

-- ── Indexes ─────────────────────────────────────────────────────────────────

-- Clustering: "open incidents of this category within R metres, nearest first".
create index incidents_centroid_gix on public.incidents using gist (centroid);
create index reports_location_gix   on public.reports   using gist (location);

-- The clustering query always filters by category before distance.
create index incidents_category_status_idx on public.incidents (category, status);

-- The one that keeps the admin queue instant at 100k rows. PRD §5 writes the
-- predicate as status != 'RESOLVED'; with VERIFIED, REJECTED and DUPLICATE in
-- the frozen enum, all four closed states have to be excluded or the index
-- carries dead rows forever.
create index incidents_priority_open_idx
  on public.incidents (priority_score desc)
  where status not in ('RESOLVED', 'VERIFIED', 'REJECTED', 'DUPLICATE');

create index reports_incident_idx on public.reports (incident_id);
create index reports_user_created_idx on public.reports (user_id, created_at desc);

-- ── Ticket IDs ──────────────────────────────────────────────────────────────
-- Crockford-ish base32, no I/O/U so a citizen reading one aloud is unambiguous.

create or replace function public.generate_ticket_id()
returns text
language plpgsql
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKLMNPQRSTVWXYZ';
  candidate text;
  i int;
begin
  loop
    candidate := '';
    for i in 1..5 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.reports where ticket_id = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.set_ticket_id()
returns trigger
language plpgsql
as $$
begin
  if new.ticket_id is null then
    new.ticket_id := public.generate_ticket_id();
  end if;
  return new;
end;
$$;

create trigger reports_ticket_id
  before insert on public.reports
  for each row execute function public.set_ticket_id();

-- ── Status transition guard ─────────────────────────────────────────────────
-- Mirrors STATUS_TRANSITIONS in lib/contracts/enums.ts. Enforced in the database
-- because the API is not the only writer — the cron, the seed script and a
-- future admin SQL fix all pass through here.

create or replace function public.enforce_status_transition()
returns trigger
language plpgsql
as $$
declare
  allowed status_enum[];
begin
  if new.status = old.status then
    return new;
  end if;

  allowed := case old.status
    when 'SUBMITTED'   then array['ACKNOWLEDGED','REJECTED','DUPLICATE']::status_enum[]
    when 'ACKNOWLEDGED' then array['ASSIGNED','REJECTED','DUPLICATE']::status_enum[]
    when 'ASSIGNED'    then array['IN_PROGRESS','ACKNOWLEDGED','REJECTED','DUPLICATE']::status_enum[]
    when 'IN_PROGRESS' then array['RESOLVED','ASSIGNED','REJECTED','DUPLICATE']::status_enum[]
    when 'RESOLVED'    then array['VERIFIED','REOPENED']::status_enum[]
    when 'REOPENED'    then array['ASSIGNED','IN_PROGRESS','REJECTED','DUPLICATE']::status_enum[]
    else array[]::status_enum[]
  end;

  if not (new.status = any(allowed)) then
    raise exception 'illegal status transition: % -> %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  -- Proof of work is mandatory. PRD §10.6 makes the resolution photo the thing
  -- that stops a department closing an incident it never touched.
  if new.status = 'RESOLVED' and coalesce(new.resolution_photo_url, '') = '' then
    raise exception 'a resolution photo is required before resolving'
      using errcode = 'check_violation';
  end if;

  insert into public.status_history (incident_id, from_status, to_status, at)
  values (new.id, old.status, new.status, now());

  new.updated_at := now();
  return new;
end;
$$;

create trigger incidents_status_guard
  before update of status on public.incidents
  for each row execute function public.enforce_status_transition();

-- ── Unique-user report_count ────────────────────────────────────────────────
-- Kept correct by the database rather than by whoever remembers to update it.

create or replace function public.refresh_report_count()
returns trigger
language plpgsql
as $$
declare
  target uuid := coalesce(new.incident_id, old.incident_id);
begin
  update public.incidents
     set report_count = (
           select count(*) from public.incident_reporters where incident_id = target
         ),
         updated_at = now()
   where id = target;
  return null;
end;
$$;

create trigger incident_reporters_count
  after insert or delete on public.incident_reporters
  for each row execute function public.refresh_report_count();

-- ── Seed reference rows ─────────────────────────────────────────────────────
-- Values match CATEGORY_SEVERITY_SEED and CATEGORY_DEPARTMENT in
-- lib/contracts/enums.ts. Editable from admin settings afterwards.

insert into public.departments (code, name, sla_hours) values
  ('SANITATION',     'Sanitation',       48),
  ('PUBLIC_WORKS',   'Public Works',     72),
  ('ELECTRICAL',     'Electrical',       24),
  ('WATER_DRAINAGE', 'Water & Drainage', 24);

insert into public.category_severity (category, severity, department) values
  ('STRUCTURAL',    10, 'PUBLIC_WORKS'),
  ('ELECTRICAL',     9, 'ELECTRICAL'),
  ('DRAIN_MANHOLE',  9, 'WATER_DRAINAGE'),
  ('WATER_LEAK',     7, 'WATER_DRAINAGE'),
  ('POTHOLE',        6, 'PUBLIC_WORKS'),
  ('FOOTPATH',       4, 'PUBLIC_WORKS'),
  ('GARBAGE',        3, 'SANITATION'),
  ('STREETLIGHT',    2, 'ELECTRICAL'),
  ('OTHER',          2, null);
