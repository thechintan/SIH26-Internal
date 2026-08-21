-- ============================================================================
-- 0002_rls — Row Level Security for all four roles
--
-- Owner: B (backend). PRD §10.1: "Enforced with Supabase Row Level Security,
-- not just UI hiding." A role check that only exists in a React component is a
-- role check that anyone with the anon key can walk straight past.
--
-- Roles: CITIZEN · FIELD_STAFF · DEPT_HEAD · SUPER_ADMIN
-- ============================================================================

alter table public.users                enable row level security;
alter table public.reports              enable row level security;
alter table public.incidents            enable row level security;
alter table public.incident_reporters   enable row level security;
alter table public.status_history       enable row level security;
alter table public.report_verifications enable row level security;
alter table public.category_severity    enable row level security;
alter table public.departments          enable row level security;
alter table public.wards                enable row level security;

-- ── Helpers ─────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so the policies can read public.users without recursing back
-- through this same set of policies.

create or replace function public.current_role_of()
returns role_enum
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.current_department()
returns department_enum
language sql
stable
security definer
set search_path = public
as $$
  select department from public.users where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select public.current_role_of() in ('FIELD_STAFF', 'DEPT_HEAD', 'SUPER_ADMIN');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_role_of() in ('DEPT_HEAD', 'SUPER_ADMIN');
$$;

-- ── users ───────────────────────────────────────────────────────────────────

create policy users_self_read on public.users
  for select using (id = auth.uid() or public.is_admin());

create policy users_self_update on public.users
  for update using (id = auth.uid())
  -- A citizen may edit their name and phone. They may not promote themselves;
  -- the role column is guarded by the trigger below, because a WITH CHECK
  -- cannot see the old row.
  with check (id = auth.uid());

create policy users_admin_manage on public.users
  for all using (public.current_role_of() = 'SUPER_ADMIN')
  with check (public.current_role_of() = 'SUPER_ADMIN');

create or replace function public.guard_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and public.current_role_of() is distinct from 'SUPER_ADMIN' then
    raise exception 'only a super admin can change a role'
      using errcode = 'insufficient_privilege';
  end if;
  if new.department is distinct from old.department
     and public.current_role_of() is distinct from 'SUPER_ADMIN' then
    raise exception 'only a super admin can change a department posting'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger users_guard_role
  before update on public.users
  for each row execute function public.guard_role_escalation();

-- ── reports ─────────────────────────────────────────────────────────────────
-- A citizen sees their own reports and nothing else. Someone else's photo,
-- exact coordinates and free-text note are not public data, even though the
-- incident they roll up into is.

create policy reports_own_read on public.reports
  for select using (user_id = auth.uid() or public.is_staff());

create policy reports_own_insert on public.reports
  for insert with check (user_id = auth.uid());

-- Deliberately no update or delete policy for citizens. A report is a
-- statement of fact at a point in time; editing one after it has been clustered
-- and scored would silently rewrite an incident's history.

create policy reports_admin_update on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ── incidents ───────────────────────────────────────────────────────────────
-- Readable by anyone, including logged out. PRD §9.1 wants the public map
-- browsable before sign-in: forcing OTP at the door kills conversion, and
-- judges bounce off it too. Incidents are aggregates and carry no personal data.

create policy incidents_public_read on public.incidents
  for select using (true);

-- Department heads work their own department's queue; super admins see all.
create policy incidents_admin_update on public.incidents
  for update using (
    public.current_role_of() = 'SUPER_ADMIN'
    or (public.current_role_of() = 'DEPT_HEAD' and department = public.current_department())
  )
  with check (
    public.current_role_of() = 'SUPER_ADMIN'
    or (public.current_role_of() = 'DEPT_HEAD' and department = public.current_department())
  );

-- Field staff touch only what is assigned to them, and only to move it forward.
create policy incidents_field_update on public.incidents
  for update using (
    public.current_role_of() = 'FIELD_STAFF' and assigned_to = auth.uid()
  )
  with check (
    public.current_role_of() = 'FIELD_STAFF' and assigned_to = auth.uid()
  );

-- Incidents are created by the clustering path (service role), never by a
-- client. No insert policy is intentional.

-- ── incident_reporters ──────────────────────────────────────────────────────
-- Written only by the clustering path under the service role. Citizens may
-- check their own membership so the UI can tell them they already reported this.

create policy incident_reporters_read on public.incident_reporters
  for select using (user_id = auth.uid() or public.is_staff());

-- ── status_history ──────────────────────────────────────────────────────────
-- Public: this is the accountability trail, and the citizen timeline is built
-- from it. Actor identity is joined in server-side for staff only.

create policy status_history_read on public.status_history
  for select using (true);

-- ── report_verifications ────────────────────────────────────────────────────

create policy verifications_own on public.report_verifications
  for select using (user_id = auth.uid() or public.is_staff());

create policy verifications_insert on public.report_verifications
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.reports r
       where r.id = report_id and r.user_id = auth.uid()
    )
  );

-- ── Reference tables ────────────────────────────────────────────────────────

create policy departments_read on public.departments for select using (true);
create policy wards_read       on public.wards       for select using (true);
create policy severity_read    on public.category_severity for select using (true);

-- Only a super admin retunes the severity weights. PRD §7 makes this editable
-- config; it is also the single most abusable number in the product, since it
-- reorders every queue in the municipality.
create policy severity_admin_write on public.category_severity
  for all using (public.current_role_of() = 'SUPER_ADMIN')
  with check (public.current_role_of() = 'SUPER_ADMIN');
