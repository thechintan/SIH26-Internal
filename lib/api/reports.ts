/**
 * Report endpoints — the citizen side of the API.
 *
 * Owner: B (backend). These are plain `Request → Response` functions so they can
 * be unit-tested without a Next.js server. Once A's scaffold lands, the route
 * files under `app/api/**` are three-line re-exports of these.
 *
 *   POST   /api/reports              submit a report, get the clustering result
 *   GET    /api/my-reports           the citizen's own reports
 *   GET    /api/reports/:id          tracking timeline
 *   POST   /api/reports/:id/verify   "was this actually fixed?"
 */
import {
  CreateReportRequestSchema,
  type CreateReportResponse,
  type MyReportListItem,
  type ReportDetail,
  type TimelineEntry,
  VerifyReportRequestSchema,
  type VerifyReportResponse,
} from '../contracts/report';
import { PageQuerySchema } from '../contracts/common';
import {
  REPORT_RATE_LIMIT_PER_HOUR,
  REOPEN_THRESHOLD,
  type Department,
  type Status,
} from '../contracts/enums';
import { supabaseAdmin } from '../supabase/admin';
import { getCaller } from '../supabase/request';
import { fail, ok, parseBody, parseQuery } from './respond';
import { clusterReport } from './clustering';

/* ── POST /api/reports ────────────────────────────────────────────────────── */

export async function createReport(request: Request): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller) return fail('UNAUTHORIZED', 'Sign in to submit a report');

  const parsed = await parseBody(request, CreateReportRequestSchema);
  if ('response' in parsed) return parsed.response;
  const body = parsed.data;

  // Rate limit counted in the database, not in memory. Serverless invocations
  // do not share state, so an in-process counter on Vercel limits nothing.
  const admin = supabaseAdmin();
  const { data: recent, error: rateErr } = await admin.rpc('report_count_last_hour', {
    p_user_id: caller.userId,
  });
  if (rateErr) return fail('INTERNAL', 'Could not check the rate limit');
  if ((recent ?? 0) >= REPORT_RATE_LIMIT_PER_HOUR) {
    return fail(
      'RATE_LIMITED',
      `You can submit ${REPORT_RATE_LIMIT_PER_HOUR} reports an hour. Try again shortly.`,
      { retry_after_s: 600 },
    );
  }

  // Clustering runs under the service role: a citizen is not allowed to write
  // `incidents` or `incident_reporters` directly, and should not be. The report
  // insert below still goes through their own client so RLS applies to the row
  // that is actually theirs.
  let cluster;
  try {
    cluster = await clusterReport(admin, {
      category: body.category,
      location: body.location,
      gpsAccuracyM: body.gps_accuracy_m,
      address: body.address,
      userId: caller.userId,
    });
  } catch (err) {
    console.error('[api] clustering failed:', err);
    return fail('INTERNAL', 'Could not process the report location');
  }

  const { data: report, error: insertErr } = await caller.db
    .from('reports')
    .insert({
      user_id: caller.userId,
      incident_id: cluster.incidentId,
      category: body.category,
      photo_url: body.photo_url,
      location: `POINT(${body.location.lng} ${body.location.lat})`,
      gps_accuracy_m: body.gps_accuracy_m,
      address: body.address ?? null,
      description: body.description ?? null,
      severity_self: body.severity_self,
      voice_note_url: body.voice_note_url ?? null,
      device_fingerprint: body.device_fingerprint,
    })
    .select('id, ticket_id, created_at')
    .single();

  if (insertErr || !report) {
    console.error('[api] report insert failed:', insertErr);
    return fail('INTERNAL', 'Could not save the report');
  }

  const response: CreateReportResponse = {
    report_id: report.id,
    ticket_id: report.ticket_id,
    incident_id: cluster.incidentId,
    clustered: cluster.clustered,
    report_count: cluster.reportCount,
    status: 'SUBMITTED',
    created_at: report.created_at,
  };
  return ok(response, 201);
}

/* ── GET /api/my-reports ──────────────────────────────────────────────────── */

const LIST_SELECT = `
  id, ticket_id, category, photo_url, address, created_at,
  incidents ( status, report_count )
`;

export async function listMyReports(request: Request): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller) return fail('UNAUTHORIZED', 'Sign in to see your reports');

  const parsed = parseQuery(request, PageQuerySchema);
  if ('response' in parsed) return parsed.response;
  const { cursor, limit } = parsed.data;

  const from = cursor ? Number(cursor) : 0;
  if (Number.isNaN(from) || from < 0) return fail('VALIDATION_FAILED', 'Invalid cursor');

  // RLS already restricts this to the caller's own rows; the explicit filter is
  // belt and braces, and it lets the index on (user_id, created_at) be used.
  const { data, error, count } = await caller.db
    .from('reports')
    .select(LIST_SELECT, { count: 'exact' })
    .eq('user_id', caller.userId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) {
    console.error('[api] my-reports failed:', error);
    return fail('INTERNAL', 'Could not load your reports');
  }

  const items: MyReportListItem[] = (data ?? []).map((row: any) => ({
    report_id: row.id,
    ticket_id: row.ticket_id,
    category: row.category,
    photo_url: row.photo_url,
    address: row.address ?? 'Location pinned',
    status: row.incidents?.status ?? 'SUBMITTED',
    created_at: row.created_at,
    report_count: row.incidents?.report_count ?? 1,
    awaiting_verification: row.incidents?.status === 'RESOLVED',
  }));

  const next = from + limit < (count ?? 0) ? String(from + limit) : null;
  return ok({ items, next_cursor: next, total: count ?? items.length });
}

/* ── GET /api/reports/:id ─────────────────────────────────────────────────── */

export async function getReport(request: Request, reportId: string): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller) return fail('UNAUTHORIZED', 'Sign in to track a report');

  const { data: row, error } = await caller.db
    .from('reports')
    .select(
      `id, ticket_id, category, photo_url, address, description, severity_self,
       voice_note_url, gps_accuracy_m, lat, lng, created_at,
       incident_id,
       incidents ( status, report_count, department, resolution_photo_url )`,
    )
    .eq('id', reportId)
    .maybeSingle();

  if (error) return fail('INTERNAL', 'Could not load the report');
  // RLS returns nothing for someone else's report, which is a 404 rather than a
  // 403 on purpose: confirming a report exists is itself information.
  if (!row) return fail('NOT_FOUND', 'Report not found');

  const incident = (row as any).incidents;

  const { data: history } = await caller.db
    .from('status_history')
    .select('to_status, at, note')
    .eq('incident_id', (row as any).incident_id)
    .order('at', { ascending: true });

  const timeline: TimelineEntry[] = (history ?? []).map((h: any) => ({
    status: h.to_status as Status,
    at: h.at,
    department: h.to_status === 'ACKNOWLEDGED' ? (incident?.department as Department) ?? null : null,
    note: h.note ?? null,
  }));

  // A report always has at least a SUBMITTED row; synthesise it if the history
  // trigger has not fired yet, so the timeline is never empty on screen.
  if (timeline.length === 0) {
    timeline.push({ status: 'SUBMITTED', at: (row as any).created_at, department: null, note: null });
  }

  const { data: myVerification } = await caller.db
    .from('report_verifications')
    .select('fixed')
    .eq('report_id', reportId)
    .maybeSingle();

  const detail: ReportDetail = {
    report_id: (row as any).id,
    ticket_id: (row as any).ticket_id,
    category: (row as any).category,
    photo_url: (row as any).photo_url,
    address: (row as any).address ?? 'Location pinned',
    status: incident?.status ?? 'SUBMITTED',
    created_at: (row as any).created_at,
    report_count: incident?.report_count ?? 1,
    awaiting_verification: incident?.status === 'RESOLVED',
    location: { lat: (row as any).lat, lng: (row as any).lng },
    description: (row as any).description ?? null,
    severity_self: (row as any).severity_self,
    voice_note_url: (row as any).voice_note_url ?? null,
    timeline,
    resolution_photo_url: incident?.resolution_photo_url ?? null,
    verified_by_me: myVerification ? (myVerification.fixed as boolean) : null,
  };

  return ok(detail);
}

/* ── POST /api/reports/:id/verify ─────────────────────────────────────────── */

/**
 * The "was this actually fixed?" vote.
 *
 * PRD §9.4 calls the No path load-bearing, and it is: without citizen
 * verification a department can close an incident it never touched, and every
 * downstream analytic — resolution time, SLA compliance, ward scorecards —
 * becomes fiction. Past 40% not-fixed the incident reopens on its own.
 */
export async function verifyReport(request: Request, reportId: string): Promise<Response> {
  const caller = await getCaller(request);
  if (!caller) return fail('UNAUTHORIZED', 'Sign in to verify a report');

  const parsed = await parseBody(request, VerifyReportRequestSchema);
  if ('response' in parsed) return parsed.response;

  const { data: report } = await caller.db
    .from('reports')
    .select('id, incident_id, incidents ( status )')
    .eq('id', reportId)
    .maybeSingle();
  if (!report) return fail('NOT_FOUND', 'Report not found');

  const incidentId = (report as any).incident_id as string;
  const currentStatus = (report as any).incidents?.status as Status;

  if (currentStatus !== 'RESOLVED') {
    return fail(
      'CONFLICT',
      'This report has not been marked resolved yet, so there is nothing to verify',
    );
  }

  const { error: voteErr } = await caller.db.from('report_verifications').upsert({
    report_id: reportId,
    incident_id: incidentId,
    user_id: caller.userId,
    fixed: parsed.data.fixed,
    note: parsed.data.note ?? null,
  });
  if (voteErr) {
    console.error('[api] verification failed:', voteErr);
    return fail('INTERNAL', 'Could not record your answer');
  }

  const admin = supabaseAdmin();
  const { data: votes } = await admin
    .from('report_verifications')
    .select('fixed')
    .eq('incident_id', incidentId);

  const total = votes?.length ?? 0;
  const notFixed = votes?.filter((v: any) => v.fixed === false).length ?? 0;
  const shouldReopen = total > 0 && notFixed / total > REOPEN_THRESHOLD;

  let nextStatus: Status = currentStatus;
  if (shouldReopen) nextStatus = 'REOPENED';
  else if (parsed.data.fixed) nextStatus = 'VERIFIED';

  if (nextStatus !== currentStatus) {
    // The status trigger validates the transition and writes status_history.
    const { error: statusErr } = await admin
      .from('incidents')
      .update({ status: nextStatus })
      .eq('id', incidentId);
    if (statusErr) {
      console.error('[api] status update failed:', statusErr);
      nextStatus = currentStatus;
    }
  }

  const response: VerifyReportResponse = {
    report_id: reportId,
    incident_status: nextStatus,
    reopened: nextStatus === 'REOPENED',
  };
  return ok(response);
}
