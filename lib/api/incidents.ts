/**
 * Incident endpoints — the admin side of the API.
 *
 * Owner: B (backend).
 *
 *   GET   /api/incidents        the ranked queue
 *   GET   /api/incidents/:id    detail, including the priority breakdown
 *   PATCH /api/incidents/:id    assign, transition, reprioritize
 *   POST  /api/incidents/merge  fold fragments into one incident
 *   GET   /api/stats            public counters
 *
 * The queue reads `priority_score` off the row. It never computes it. PRD §7 is
 * unambiguous about this and it is the difference between a dashboard that opens
 * instantly at 100k rows and one that times out.
 */
import {
  IncidentListQuerySchema,
  type IncidentDetail,
  type IncidentSummary,
  MergeIncidentsRequestSchema,
  type MergeIncidentsResponse,
  type PublicStats,
  UpdateIncidentRequestSchema,
} from '../contracts/incident';
import {
  canTransition,
  priorityTier,
  type Status,
} from '../contracts/enums';
import { supabaseAdmin } from '../supabase/admin';
import { getCaller, isAdmin, isStaff } from '../supabase/request';
import { fail, ok, parseBody, parseQuery } from './respond';

const DAY_MS = 86_400_000;
const ageDays = (iso: string) => (Date.now() - Date.parse(iso)) / DAY_MS;

const SUMMARY_SELECT = `
  id, category, address, ward_id, report_count, status, department,
  priority_score, manual_override, flagged_mismatch, first_reported_at,
  previous_incident_id,
  centroid_lat, centroid_lng,
  wards ( name )
`;

function toSummary(row: any, thumbnail: string | null = null): IncidentSummary {
  return {
    incident_id: row.id,
    category: row.category,
    thumbnail_url: thumbnail,
    centroid: { lat: row.centroid_lat, lng: row.centroid_lng },
    address: row.address ?? 'Location pinned',
    ward_name: row.wards?.name ?? null,
    report_count: row.report_count,
    status: row.status,
    department: row.department ?? null,
    priority_score: row.priority_score,
    priority_tier: priorityTier(row.priority_score),
    manual_override: row.manual_override,
    first_reported_at: row.first_reported_at,
    age_days: Math.round(ageDays(row.first_reported_at) * 10) / 10,
    flagged_mismatch: row.flagged_mismatch ?? false,
    is_recurrence: Boolean(row.previous_incident_id),
  };
}

/* ── GET /api/incidents ───────────────────────────────────────────────────── */

export async function listIncidents(request: Request): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller || !isStaff(caller)) {
    return fail('FORBIDDEN', 'The incident queue is for municipal staff');
  }

  const parsed = parseQuery(request, IncidentListQuerySchema);
  if ('response' in parsed) return parsed.response;
  const q = parsed.data;

  const from = q.cursor ? Number(q.cursor) : 0;
  if (Number.isNaN(from) || from < 0) return fail('VALIDATION_FAILED', 'Invalid cursor');

  let query = caller.db.from('incidents').select(SUMMARY_SELECT, { count: 'exact' });

  if (q.category) query = query.eq('category', q.category);
  if (q.status) query = query.eq('status', q.status);
  if (q.department) query = query.eq('department', q.department);
  if (q.ward_id) query = query.eq('ward_id', q.ward_id);
  if (q.from) query = query.gte('first_reported_at', q.from);
  if (q.to) query = query.lte('first_reported_at', q.to);

  // Default view is the open queue. Closed incidents are reachable by asking for
  // a status explicitly — an admin opening the command centre wants work, not
  // an archive.
  if (!q.status) {
    query = query.not('status', 'in', '("RESOLVED","VERIFIED","REJECTED","DUPLICATE")');
  }

  const order = {
    priority: () => query.order('priority_score', { ascending: false }),
    newest: () => query.order('first_reported_at', { ascending: false }),
    oldest: () => query.order('first_reported_at', { ascending: true }),
    most_reported: () => query.order('report_count', { ascending: false }),
  };
  query = order[q.sort]();

  const { data, error, count } = await query.range(from, from + q.limit - 1);
  if (error) {
    console.error('[api] incident list failed:', error);
    return fail('INTERNAL', 'Could not load the queue');
  }

  let items = (data ?? []).map((row) => toSummary(row));

  // priority_tier is derived, so it cannot be filtered in SQL without either a
  // generated column or duplicating the thresholds in the database. Filtering
  // the page is a deliberate accepted limitation while the thresholds are still
  // provisional — revisit once decision 003's re-check lands.
  if (q.priority_tier) items = items.filter((i) => i.priority_tier === q.priority_tier);

  const next = from + q.limit < (count ?? 0) ? String(from + q.limit) : null;
  return ok({ items, next_cursor: next, total: count ?? items.length });
}

/* ── GET /api/incidents/:id ───────────────────────────────────────────────── */

export async function getIncident(request: Request, incidentId: string): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller || !isStaff(caller)) {
    return fail('FORBIDDEN', 'Incident detail is for municipal staff');
  }

  const { data: row, error } = await caller.db
    .from('incidents')
    .select(
      `${SUMMARY_SELECT}, priority_breakdown, assigned_to, sla_due_at,
       resolved_at, resolution_photo_url`,
    )
    .eq('id', incidentId)
    .maybeSingle();

  if (error) return fail('INTERNAL', 'Could not load the incident');
  if (!row) return fail('NOT_FOUND', 'Incident not found');

  const admin = supabaseAdmin();

  // Every contributing report: the photo gallery and the scatter overlay that
  // shows an admin the GPS spread behind the centroid.
  const { data: reports } = await admin
    .from('reports')
    .select(
      `id, ticket_id, photo_url, lat, lng, gps_accuracy_m, description,
       severity_self, voice_note_url, created_at`,
    )
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false });

  const { data: history } = await admin
    .from('status_history')
    .select('from_status, to_status, at, note, users ( full_name )')
    .eq('incident_id', incidentId)
    .order('at', { ascending: true });

  const { data: assignee } = (row as any).assigned_to
    ? await admin.from('users').select('id, full_name').eq('id', (row as any).assigned_to).maybeSingle()
    : { data: null };

  const { data: votes } = await admin
    .from('report_verifications')
    .select('fixed')
    .eq('incident_id', incidentId);

  // Walk the recurrence chain back. Three links at one location means the
  // infrastructure needs replacing, not patching — which is the difference
  // between a ticket queue and infrastructure intelligence.
  const chain: IncidentDetail['recurrence_chain'] = [];
  let previousId: string | null = (row as any).previous_incident_id ?? null;
  while (previousId && chain.length < 10) {
    const { data: prev }: { data: any } = await admin
      .from('incidents')
      .select('id, first_reported_at, resolved_at, previous_incident_id')
      .eq('id', previousId)
      .maybeSingle();
    if (!prev) break;
    chain.push({
      incident_id: prev.id,
      first_reported_at: prev.first_reported_at,
      resolved_at: prev.resolved_at ?? null,
    });
    previousId = prev.previous_incident_id ?? null;
  }

  const consensus = { MINOR: 0, MODERATE: 0, SEVERE: 0 };
  for (const r of reports ?? []) {
    consensus[(r as any).severity_self as keyof typeof consensus]++;
  }

  const fixed = (votes ?? []).filter((v: any) => v.fixed === true).length;
  const notFixed = (votes ?? []).filter((v: any) => v.fixed === false).length;

  const detail: IncidentDetail = {
    ...toSummary(row, (reports?.[0] as any)?.photo_url ?? null),
    priority_breakdown: ((row as any).priority_breakdown as IncidentDetail['priority_breakdown']) ?? null,
    reports: (reports ?? []).map((r: any) => ({
      report_id: r.id,
      ticket_id: r.ticket_id,
      photo_url: r.photo_url,
      location: { lat: r.lat, lng: r.lng },
      gps_accuracy_m: r.gps_accuracy_m,
      description: r.description ?? null,
      severity_self: r.severity_self,
      voice_note_url: r.voice_note_url ?? null,
      created_at: r.created_at,
    })),
    severity_consensus: consensus,
    status_history: (history ?? []).map((h: any) => ({
      from_status: h.from_status ?? null,
      to_status: h.to_status,
      at: h.at,
      actor_name: h.users?.full_name ?? null,
      note: h.note ?? null,
    })),
    assigned_to: assignee ? { user_id: assignee.id, name: assignee.full_name ?? 'Unnamed' } : null,
    sla_due_at: (row as any).sla_due_at ?? null,
    recurrence_chain: chain,
    resolved_at: (row as any).resolved_at ?? null,
    resolution_photo_url: (row as any).resolution_photo_url ?? null,
    verification: {
      fixed: fixed,
      not_fixed: notFixed,
      pending: Math.max(0, ((row as any).report_count ?? 0) - fixed - notFixed),
    },
  };

  return ok(detail);
}

/* ── PATCH /api/incidents/:id ─────────────────────────────────────────────── */

export async function updateIncident(request: Request, incidentId: string): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller || !isStaff(caller)) {
    return fail('FORBIDDEN', 'Only municipal staff can act on an incident');
  }

  const parsed = await parseBody(request, UpdateIncidentRequestSchema);
  if ('response' in parsed) return parsed.response;
  const patch = parsed.data;

  const { data: current } = await caller.db
    .from('incidents')
    .select('id, status, department, assigned_to, resolution_photo_url')
    .eq('id', incidentId)
    .maybeSingle();
  if (!current) return fail('NOT_FOUND', 'Incident not found');

  // Field staff move their own work forward and nothing else. Reassignment,
  // department changes and reprioritising are admin actions.
  if (caller.role === 'FIELD_STAFF') {
    const fieldAllowed = ['status', 'resolution_photo_url', 'note'];
    const attempted = Object.keys(patch).filter((k) => !fieldAllowed.includes(k));
    if (attempted.length) {
      return fail('FORBIDDEN', `Field staff cannot change: ${attempted.join(', ')}`);
    }
    if ((current as any).assigned_to !== caller.userId) {
      return fail('FORBIDDEN', 'This incident is not assigned to you');
    }
  }

  if (patch.priority_score !== undefined && !isAdmin(caller)) {
    return fail('FORBIDDEN', 'Only an admin can override a priority score');
  }

  const update: Record<string, unknown> = {};

  if (patch.status) {
    const from = (current as any).status as Status;
    // Checked here for a clean 409 with a readable message; the database trigger
    // checks it again, because the API is not the only writer.
    if (!canTransition(from, patch.status)) {
      return fail('ILLEGAL_TRANSITION', `${from} cannot move to ${patch.status}`);
    }
    const photo = patch.resolution_photo_url ?? (current as any).resolution_photo_url;
    if (patch.status === 'RESOLVED' && !photo) {
      return fail('VALIDATION_FAILED', 'A resolution photo is required before resolving', {
        fields: { resolution_photo_url: 'Required' },
      });
    }
    update.status = patch.status;
    if (patch.status === 'RESOLVED') update.resolved_at = new Date().toISOString();
  }

  if (patch.department !== undefined) update.department = patch.department;
  if (patch.assigned_to !== undefined) update.assigned_to = patch.assigned_to;
  if (patch.sla_due_at !== undefined) update.sla_due_at = patch.sla_due_at;
  if (patch.resolution_photo_url !== undefined) {
    update.resolution_photo_url = patch.resolution_photo_url;
  }
  if (patch.priority_score !== undefined) {
    // Pinning a score takes the row out of the scorer's hands until it is
    // cleared; sending null hands it back.
    update.manual_override = patch.priority_score !== null;
    if (patch.priority_score !== null) update.priority_score = patch.priority_score;
  }

  const { error } = await caller.db.from('incidents').update(update).eq('id', incidentId);
  if (error) {
    // The transition trigger raises check_violation for an illegal move.
    if (/illegal status transition|resolution photo/i.test(error.message)) {
      return fail('ILLEGAL_TRANSITION', error.message);
    }
    console.error('[api] incident update failed:', error);
    return fail('INTERNAL', 'Could not update the incident');
  }

  // The note belongs on the audit trail, not on the incident row.
  if (patch.note && patch.status) {
    await supabaseAdmin()
      .from('status_history')
      .update({ note: patch.note, actor_id: caller.userId })
      .eq('incident_id', incidentId)
      .order('at', { ascending: false })
      .limit(1);
  }

  return getIncident(request, incidentId);
}

/* ── POST /api/incidents/merge ────────────────────────────────────────────── */

/**
 * PRD §6 documents this as the answer to elongated issues: a 60m stretch of
 * broken road fragments into two or three incidents, and an admin merge action
 * is far cheaper than road-network-aware clustering.
 */
export async function mergeIncidents(request: Request): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller || !isAdmin(caller)) {
    return fail('FORBIDDEN', 'Only an admin can merge incidents');
  }

  const parsed = await parseBody(request, MergeIncidentsRequestSchema);
  if ('response' in parsed) return parsed.response;
  const { target_incident_id, source_incident_ids } = parsed.data;

  if (source_incident_ids.includes(target_incident_id)) {
    return fail('VALIDATION_FAILED', 'An incident cannot be merged into itself');
  }

  const admin = supabaseAdmin();

  const { data: target } = await admin
    .from('incidents')
    .select('id, category')
    .eq('id', target_incident_id)
    .maybeSingle();
  if (!target) return fail('NOT_FOUND', 'Target incident not found');

  const { data: sources } = await admin
    .from('incidents')
    .select('id, category')
    .in('id', source_incident_ids);

  // Merging across categories would silently destroy the same-category rule that
  // keeps a pothole and a broken streetlight on one corner as two incidents.
  const mismatched = (sources ?? []).filter((s: any) => s.category !== (target as any).category);
  if (mismatched.length) {
    return fail('CONFLICT', 'All merged incidents must share the same category');
  }

  let merged = 0;
  for (const source of sources ?? []) {
    const id = (source as any).id as string;

    await admin.from('reports').update({ incident_id: target_incident_id }).eq('incident_id', id);

    // Union, not sum: a person who reported both fragments counts once.
    const { data: reporters } = await admin
      .from('incident_reporters')
      .select('user_id')
      .eq('incident_id', id);
    for (const r of reporters ?? []) {
      await admin
        .from('incident_reporters')
        .upsert(
          { incident_id: target_incident_id, user_id: (r as any).user_id },
          { onConflict: 'incident_id,user_id', ignoreDuplicates: true },
        );
    }
    await admin.from('incident_reporters').delete().eq('incident_id', id);

    await admin.from('incidents').update({ status: 'DUPLICATE' }).eq('id', id);
    merged++;
  }

  await admin.rpc('recompute_centroid', { p_incident_id: target_incident_id });

  const { data: updated } = await admin
    .from('incidents')
    .select('report_count')
    .eq('id', target_incident_id)
    .single();

  const response: MergeIncidentsResponse = {
    target_incident_id,
    merged_count: merged,
    report_count: (updated as any)?.report_count ?? 0,
  };
  return ok(response);
}

/* ── GET /api/stats ───────────────────────────────────────────────────────── */

/** Public, no auth. PRD §9.1's live counter on the landing page. */
export async function getPublicStats(): Promise<Response> {
  const { data, error } = await supabaseAdmin().rpc('public_stats');
  if (error) {
    console.error('[api] stats failed:', error);
    return fail('INTERNAL', 'Could not load the counters');
  }
  const row = (data as any)?.[0] ?? {};
  const stats: PublicStats = {
    reports_total: Number(row.reports_total ?? 0),
    incidents_total: Number(row.incidents_total ?? 0),
    resolved_total: Number(row.resolved_total ?? 0),
  };
  return ok(stats);
}
