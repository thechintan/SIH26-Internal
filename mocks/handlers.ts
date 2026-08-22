/**
 * MSW handlers — one per endpoint in lib/contracts.
 *
 * This is the mechanism PRD §11 calls the whole trick: A and D develop against
 * these and never wait on B. When B's real routes land, flip NEXT_PUBLIC_USE_MOCKS
 * to false and nothing else changes.
 *
 * Every response is validated through its real Zod schema before it goes out, so
 * a handler that drifts from the contract throws here rather than teaching a
 * teammate the wrong shape.
 *
 * Owner: E (integration).
 */
import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import {
  CreateReportRequestSchema,
  CreateReportResponseSchema,
  MyReportsResponseSchema,
  ReportDetailSchema,
  VerifyReportRequestSchema,
  VerifyReportResponseSchema,
} from '../lib/contracts/report';
import {
  CreateUploadUrlRequestSchema,
  CreateUploadUrlResponseSchema,
} from '../lib/contracts/upload';
import {
  IncidentDetailSchema,
  IncidentListQuerySchema,
  IncidentListResponseSchema,
  MergeIncidentsRequestSchema,
  MergeIncidentsResponseSchema,
  PublicStatsSchema,
  UpdateIncidentRequestSchema,
} from '../lib/contracts/incident';
import { canTransition, REOPEN_THRESHOLD } from '../lib/contracts/enums';
import {
  INCIDENTS,
  INCIDENT_SUMMARIES,
  MY_REPORTS,
  MY_REPORT_DETAILS,
  PUBLIC_STATS,
  mockTicketId,
  mockUuid,
} from './fixtures';

/* ── helpers ──────────────────────────────────────────────────────────────── */

/** Validate on the way out. A mock that lies is worse than no mock. */
function json<T extends z.ZodTypeAny>(schema: T, body: unknown, status = 200) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.error('[msw] handler response violates its contract:', parsed.error.format());
    return HttpResponse.json(
      { error: { code: 'INTERNAL', message: 'Mock response failed contract validation' } },
      { status: 500 },
    );
  }
  return HttpResponse.json(parsed.data, { status });
}

function badRequest(error: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[issue.path.join('.')] = issue.message;
  return HttpResponse.json(
    { error: { code: 'VALIDATION_FAILED', message: 'Request failed validation', fields } },
    { status: 400 },
  );
}

const notFound = () =>
  HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 });

/** Cursor is just an index here. The real API will use a keyset cursor. */
function page<T>(items: T[], cursor: string | undefined, limit: number) {
  const start = cursor ? Number(cursor) : 0;
  const slice = items.slice(start, start + limit);
  const next = start + limit < items.length ? String(start + limit) : null;
  return { items: slice, next_cursor: next, total: items.length };
}

/* ── mutable mock state ───────────────────────────────────────────────────── */

// Mutated by the handlers so a session feels real: submit a report and the
// counter moves, change a status and the queue reflects it. Reset on reload.
const incidents = INCIDENTS.map((i) => ({ ...i }));
const myReports = [...MY_REPORTS];
const myReportDetails = { ...MY_REPORT_DETAILS };

/* ── handlers ─────────────────────────────────────────────────────────────── */

export const handlers = [
  /* POST /api/uploads — presigned URL */
  http.post('/api/uploads', async ({ request }) => {
    const parsed = CreateUploadUrlRequestSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error);

    const path = `mock/${parsed.data.kind.toLowerCase()}/${mockUuid()}`;
    return json(CreateUploadUrlResponseSchema, {
      // Absorbed by the passthrough handler below so A's progress bar has
      // something real to run against.
      upload_url: `https://mock.storage.local/${path}`,
      path,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
  }),

  /** Swallow the actual file PUT so the upload step completes offline. */
  http.put('https://mock.storage.local/*', () => new HttpResponse(null, { status: 200 })),

  /* POST /api/reports — ingest + clustering result */
  http.post('/api/reports', async ({ request }) => {
    const parsed = CreateReportRequestSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error);
    const body = parsed.data;

    // Mock clustering: same category within the adaptive radius joins the
    // nearest open incident. Crude by design — C owns the real thing. What
    // matters is that A sees the clustered/not-clustered branch of the
    // confirmation screen, because that message is what makes a duplicate
    // report feel like a contribution.
    const R = 35 + body.gps_accuracy_m;
    const match = incidents.find((inc) => {
      if (inc.category !== body.category) return false; // never cluster across categories
      if (['RESOLVED', 'VERIFIED', 'REJECTED', 'DUPLICATE'].includes(inc.status)) return false;
      const dLat = (inc.centroid.lat - body.location.lat) * 111_000;
      const dLng =
        (inc.centroid.lng - body.location.lng) *
        111_000 *
        Math.cos((body.location.lat * Math.PI) / 180);
      return Math.hypot(dLat, dLng) <= R;
    });

    const clustered = Boolean(match);
    if (match) match.report_count += 1;

    const report_id = mockUuid();
    const ticket_id = mockTicketId();
    const created_at = new Date().toISOString();

    const listItem = {
      report_id,
      ticket_id,
      category: body.category,
      photo_url: body.photo_url,
      address: body.address ?? match?.address ?? 'Dropped pin',
      status: 'SUBMITTED' as const,
      created_at,
      report_count: match?.report_count ?? 1,
      awaiting_verification: false,
    };
    myReports.unshift(listItem);
    myReportDetails[report_id] = {
      ...listItem,
      location: body.location,
      description: body.description ?? null,
      severity_self: body.severity_self,
      voice_note_url: body.voice_note_url ?? null,
      timeline: [{ status: 'SUBMITTED', at: created_at, department: null, note: null }],
      resolution_photo_url: null,
      verified_by_me: null,
    };

    return json(
      CreateReportResponseSchema,
      {
        report_id,
        ticket_id,
        incident_id: match?.incident_id ?? mockUuid(),
        clustered,
        report_count: match?.report_count ?? 1,
        status: 'SUBMITTED',
        created_at,
      },
      201,
    );
  }),

  /* GET /api/my-reports */
  http.get('/api/my-reports', ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    return json(
      MyReportsResponseSchema,
      page(myReports, url.searchParams.get('cursor') ?? undefined, limit),
    );
  }),

  /* GET /api/reports/:id — tracking timeline */
  http.get('/api/reports/:id', ({ params }) => {
    const detail = myReportDetails[params.id as string];
    return detail ? json(ReportDetailSchema, detail) : notFound();
  }),

  /* POST /api/reports/:id/verify — "was this actually fixed?" */
  http.post('/api/reports/:id/verify', async ({ params, request }) => {
    const detail = myReportDetails[params.id as string];
    if (!detail) return notFound();

    const parsed = VerifyReportRequestSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error);

    const inc = incidents.find((i) => i.address === detail.address);
    if (inc) {
      if (parsed.data.fixed) inc.verification.fixed += 1;
      else inc.verification.not_fixed += 1;
      inc.verification.pending = Math.max(0, inc.verification.pending - 1);

      const votes = inc.verification.fixed + inc.verification.not_fixed;
      const reopen = votes > 0 && inc.verification.not_fixed / votes > REOPEN_THRESHOLD;
      inc.status = reopen ? 'REOPENED' : parsed.data.fixed ? 'VERIFIED' : inc.status;
    }

    detail.verified_by_me = parsed.data.fixed;
    return json(VerifyReportResponseSchema, {
      report_id: detail.report_id,
      incident_status: inc?.status ?? detail.status,
      reopened: inc?.status === 'REOPENED',
    });
  }),

  /* GET /api/incidents — the ranked admin queue */
  http.get('/api/incidents', ({ request }) => {
    const url = new URL(request.url);
    const parsed = IncidentListQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) return badRequest(parsed.error);
    const q = parsed.data;

    let rows = INCIDENT_SUMMARIES.map(
      (s) => incidents.find((i) => i.incident_id === s.incident_id) ?? s,
    ).map(({ incident_id, category, thumbnail_url, centroid, address, ward_name,
             report_count, status, department, priority_score, priority_tier,
             manual_override, first_reported_at, age_days, flagged_mismatch,
             is_recurrence }) => ({
      incident_id, category, thumbnail_url, centroid, address, ward_name,
      report_count, status, department, priority_score, priority_tier,
      manual_override, first_reported_at, age_days, flagged_mismatch, is_recurrence,
    }));

    if (q.category) rows = rows.filter((r) => r.category === q.category);
    if (q.status) rows = rows.filter((r) => r.status === q.status);
    if (q.department) rows = rows.filter((r) => r.department === q.department);
    if (q.priority_tier) rows = rows.filter((r) => r.priority_tier === q.priority_tier);
    if (q.flagged_mismatch !== undefined) {
      rows = rows.filter((r) => r.flagged_mismatch === q.flagged_mismatch);
    }

    const sorters = {
      priority: (a: typeof rows[0], b: typeof rows[0]) => b.priority_score - a.priority_score,
      newest: (a: typeof rows[0], b: typeof rows[0]) =>
        Date.parse(b.first_reported_at) - Date.parse(a.first_reported_at),
      oldest: (a: typeof rows[0], b: typeof rows[0]) =>
        Date.parse(a.first_reported_at) - Date.parse(b.first_reported_at),
      most_reported: (a: typeof rows[0], b: typeof rows[0]) => b.report_count - a.report_count,
    };
    rows.sort(sorters[q.sort]);

    return json(IncidentListResponseSchema, page(rows, q.cursor, q.limit));
  }),

  /* GET /api/incidents/:id */
  http.get('/api/incidents/:id', ({ params }) => {
    const inc = incidents.find((i) => i.incident_id === params.id);
    return inc ? json(IncidentDetailSchema, inc) : notFound();
  }),

  /* PATCH /api/incidents/:id — assign, transition, reprioritize */
  http.patch('/api/incidents/:id', async ({ params, request }) => {
    const inc = incidents.find((i) => i.incident_id === params.id);
    if (!inc) return notFound();

    const parsed = UpdateIncidentRequestSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error);
    const patch = parsed.data;

    if (patch.status) {
      if (!canTransition(inc.status, patch.status)) {
        return HttpResponse.json(
          {
            error: {
              code: 'ILLEGAL_TRANSITION',
              message: `${inc.status} cannot move to ${patch.status}`,
            },
          },
          { status: 409 },
        );
      }
      // Proof of work is mandatory before an incident can be called resolved.
      if (patch.status === 'RESOLVED' && !(patch.resolution_photo_url ?? inc.resolution_photo_url)) {
        return HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_FAILED',
              message: 'A resolution photo is required before resolving',
              fields: { resolution_photo_url: 'Required' },
            },
          },
          { status: 400 },
        );
      }
      inc.status_history.push({
        from_status: inc.status,
        to_status: patch.status,
        at: new Date().toISOString(),
        actor_name: 'Mock Admin',
        note: patch.note ?? null,
      });
      inc.status = patch.status;
      if (patch.status === 'RESOLVED') inc.resolved_at = new Date().toISOString();
    }

    if (patch.department !== undefined) inc.department = patch.department;
    if (patch.resolution_photo_url !== undefined) {
      inc.resolution_photo_url = patch.resolution_photo_url;
    }
    if (patch.assigned_to !== undefined) {
      inc.assigned_to = patch.assigned_to
        ? { user_id: patch.assigned_to, name: 'Assigned Crew' }
        : null;
    }
    if (patch.sla_due_at !== undefined) inc.sla_due_at = patch.sla_due_at;
    if (patch.priority_score !== undefined) {
      // Pinning a score takes the row out of the auto-scorer's hands entirely.
      inc.manual_override = patch.priority_score !== null;
      if (patch.priority_score !== null) inc.priority_score = patch.priority_score;
    }

    return json(IncidentDetailSchema, inc);
  }),

  /* POST /api/incidents/merge */
  http.post('/api/incidents/merge', async ({ request }) => {
    const parsed = MergeIncidentsRequestSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error);

    const target = incidents.find((i) => i.incident_id === parsed.data.target_incident_id);
    if (!target) return notFound();

    let merged = 0;
    for (const id of parsed.data.source_incident_ids) {
      const src = incidents.find((i) => i.incident_id === id);
      if (!src || src.incident_id === target.incident_id) continue;
      // Union of reporters, not a sum — report_count stays a unique-user count.
      target.report_count += src.report_count;
      target.reports.push(...src.reports);
      src.status = 'DUPLICATE';
      merged++;
    }

    return json(MergeIncidentsResponseSchema, {
      target_incident_id: target.incident_id,
      merged_count: merged,
      report_count: target.report_count,
    });
  }),

  /* GET /api/stats — landing page counters */
  http.get('/api/stats', () => json(PublicStatsSchema, PUBLIC_STATS)),
];
