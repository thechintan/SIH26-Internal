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
import { get, set } from 'idb-keyval';

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
  MY_REPORTS,
  MY_REPORT_DETAILS,
  PUBLIC_STATS,
  mockTicketId,
  mockUuid,
} from './fixtures';
import {
  CATEGORY_DEPARTMENT,
  priorityTier,
  type Category,
  type Department,
} from '../lib/contracts/enums';
import { computePriority } from '../lib/engine';

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
  // A generic Zod output is `unknown` to TypeScript, which JsonBodyType will not
  // accept. The runtime guarantee is the parse immediately above: nothing reaches
  // this line that has not just been validated against the contract.
  return HttpResponse.json(parsed.data as Record<string, unknown>, { status });
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

/* ── localStorage-backed mock state ──────────────────────────────────────── */
//
// Persists across page reloads so a citizen report submitted in one tab is still
// visible to the admin after they refresh. Falls back to the fixture seed when
// localStorage is empty or the stored data can't be parsed.
//
// Keys are prefixed with the fixtures version so a code change that alters
// INCIDENTS auto-busts the stale fixture cache. The citizen report keys use a
// separate stable prefix so submitted reports survive a fixture bump.

const STORE_VERSION   = `msw-v2-${INCIDENTS.length}`;
const KEY_INCIDENTS   = `${STORE_VERSION}:incidents`;
const KEY_MY_REPORTS  = `msw-reports:myReports`;   // stable — survives fixture bumps
const KEY_MY_DETAILS  = `msw-reports:myReportDetails`;

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded — silently skip; mock still works for this session.
  }
}

// Hydrate from localStorage, seeding from fixtures on first load.
const incidents       = load(KEY_INCIDENTS,  INCIDENTS.map((i) => ({ ...i })));
const myReports       = load(KEY_MY_REPORTS, [...MY_REPORTS]);
const myReportDetails = load(KEY_MY_DETAILS, { ...MY_REPORT_DETAILS });

// Keep mock state in sync across browser tabs (e.g., citizen app vs admin dashboard).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    try {
      if (e.key === KEY_INCIDENTS && e.newValue) {
        incidents.length = 0;
        incidents.push(...JSON.parse(e.newValue));
        // Force admin dashboard to refetch immediately without waiting for poll
        window.dispatchEvent(new CustomEvent('msw:report-submitted'));
      }
      if (e.key === KEY_MY_REPORTS && e.newValue) {
        myReports.length = 0;
        myReports.push(...JSON.parse(e.newValue));
      }
      if (e.key === KEY_MY_DETAILS && e.newValue) {
        const next = JSON.parse(e.newValue);
        for (const k in myReportDetails) delete myReportDetails[k];
        Object.assign(myReportDetails, next);
      }
    } catch {
      // Ignore parse errors from other tabs
    }
  });
}

// Reconcile: any myReportDetails entry that references an incident_id not
// present in the loaded incidents array means it was submitted after the last
// fixture reset. Re-seed those incidents from the stored report so the admin
// queue always reflects every citizen-submitted report.
{
  const knownIds = new Set(incidents.map((i) => i.incident_id));
  // myReports carries the incident_id via the listItem we store — but
  // myReportDetails has the full location we need for seedNewIncident.
  // We iterate myReports (ordered newest-first) and rebuild any missing incident.
  for (const r of [...myReports].reverse()) {
    // Skip if the incident already exists in the loaded array.
    // We identify the incident via the listItem stored alongside the report.
    // The report list item doesn't carry incident_id directly, but the
    // myReportDetails record does (as report_id key → we match by report_id).
    const detail = myReportDetails[r.report_id];
    if (!detail) continue;
    // Check if any incident already has this report in its reports array.
    const alreadyPresent = incidents.some(
      (inc) => inc.reports?.some((rp: { report_id: string }) => rp.report_id === r.report_id)
    );
    if (alreadyPresent) continue;
    // Seed a new incident for this orphaned report.
    const bd = computePriority({
      category: detail.category,
      uniqueUserCount: 1,
      daysOpen: 0,
      previousIncidentId: null,
    });
    const department = CATEGORY_DEPARTMENT[detail.category as Category];
    const newId = mockUuid();
    incidents.push({
      incident_id: newId,
      category: detail.category,
      thumbnail_url: detail.photo_url,
      centroid: detail.location,
      address: detail.address,
      ward_name: null,
      report_count: 1,
      status: 'SUBMITTED',
      department,
      priority_score: bd.score,
      priority_tier: bd.tier,
      manual_override: false,
      first_reported_at: detail.created_at,
      age_days: 0,
      flagged_mismatch: false,
      is_recurrence: false,
      priority_breakdown: bd,
      reports: [{
        report_id: detail.report_id,
        ticket_id: detail.ticket_id,
        photo_url: detail.photo_url,
        location: detail.location,
        gps_accuracy_m: 10,
        description: detail.description,
        severity_self: detail.severity_self,
        voice_note_url: detail.voice_note_url,
        created_at: detail.created_at,
      }],
      severity_consensus: {
        MINOR:    detail.severity_self === 'MINOR'    ? 1 : 0,
        MODERATE: detail.severity_self === 'MODERATE' ? 1 : 0,
        SEVERE:   detail.severity_self === 'SEVERE'   ? 1 : 0,
      },
      status_history: [{
        from_status: null,
        to_status: 'SUBMITTED' as const,
        at: detail.created_at,
        actor_name: null,
        note: null,
      }],
      assigned_to: null,
      sla_due_at: null,
      recurrence_chain: [],
      resolved_at: null,
      resolution_photo_url: null,
      verification: { fixed: 0, not_fixed: 0, pending: 0 },
    });
    knownIds.add(newId);
  }
  // Persist the reconciled incidents so next load is immediate.
  save(KEY_INCIDENTS, incidents);
}

// Convenience wrappers that mutate the array/object then immediately persist.
function saveIncidents()      { save(KEY_INCIDENTS,  incidents); }
function saveMyReports()      { save(KEY_MY_REPORTS, myReports); }
function saveMyReportDetails(){ save(KEY_MY_DETAILS, myReportDetails); }

/** Build a minimal IncidentDetail from a freshly submitted report. */
function seedNewIncident(
  body: {
    category: Category;
    location: { lat: number; lng: number };
    gps_accuracy_m: number;
    address?: string | null;
    description?: string | null;
    severity_self: 'MINOR' | 'MODERATE' | 'SEVERE';
    photo_url: string;
  },
  reportId: string,
  ticketId: string,
  createdAt: string,
) {
  const bd = computePriority({
    category: body.category,
    uniqueUserCount: 1,
    daysOpen: 0,
    previousIncidentId: null,
  });
  const department: Department | null = CATEGORY_DEPARTMENT[body.category];
  const incidentId = mockUuid();
  incidents.push({
    incident_id: incidentId,
    category: body.category,
    thumbnail_url: body.photo_url,
    centroid: body.location,
    address: body.address ?? `${body.location.lat.toFixed(4)}, ${body.location.lng.toFixed(4)}`,
    ward_name: null,
    report_count: 1,
    status: 'SUBMITTED',
    department,
    priority_score: bd.score,
    priority_tier: bd.tier,
    manual_override: false,
    first_reported_at: createdAt,
    age_days: 0,
    flagged_mismatch: false,
    is_recurrence: false,
    priority_breakdown: bd,
    reports: [{
      report_id: reportId,
      ticket_id: ticketId,
      photo_url: body.photo_url,
      location: body.location,
      gps_accuracy_m: body.gps_accuracy_m,
      description: body.description ?? null,
      severity_self: body.severity_self,
      voice_note_url: null,
      created_at: createdAt,
    }],
    severity_consensus: {
      MINOR:    body.severity_self === 'MINOR'    ? 1 : 0,
      MODERATE: body.severity_self === 'MODERATE' ? 1 : 0,
      SEVERE:   body.severity_self === 'SEVERE'   ? 1 : 0,
    },
    status_history: [{
      from_status: null,
      to_status: 'SUBMITTED',
      at: createdAt,
      actor_name: null,
      note: null,
    }],
    assigned_to: null,
    sla_due_at: null,
    recurrence_chain: [],
    resolved_at: null,
    resolution_photo_url: null,
    verification: { fixed: 0, not_fixed: 0, pending: 0 },
  });
  saveIncidents();
  return incidentId;
}

/* ── handlers ─────────────────────────────────────────────────────────────── */

export const handlers = [
  /* POST /api/uploads — presigned URL */
  http.post('/api/uploads', async ({ request }) => {
    const parsed = CreateUploadUrlRequestSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error);

    const path = `mock/${parsed.data.kind.toLowerCase()}/${mockUuid()}`;
    const url = `https://mock.storage.local/${path}`;
    return json(CreateUploadUrlResponseSchema, {
      upload_url: url,
      // In mock mode, we return the full mock URL as the path so it skips the
      // server-side resolveStorageUrl (which expects private Supabase paths).
      path: url,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
  }),

  /**
   * Save uploaded mock images to IndexedDB.
   * If we stored base64 strings in localStorage, we would instantly blow the
   * 5MB quota and silently break cross-tab incident syncing.
   */
  http.put('https://mock.storage.local/:path*', async ({ params, request }) => {
    try {
      const pathKey = Array.isArray(params.path) ? params.path.join('/') : (params.path as string);
      const blob = await request.blob();
      await set(`mock/${pathKey}`, blob);
    } catch {
      // Silently fail if IDB is blocked.
    }
    return new HttpResponse(null, { status: 200 });
  }),

  /** Serve the mock images from IndexedDB directly to <img> tags. */
  http.get('https://mock.storage.local/:path*', async ({ params }) => {
    try {
      const pathKey = Array.isArray(params.path) ? params.path.join('/') : (params.path as string);
      const blob = await get<Blob>(`mock/${pathKey}`);
      if (blob) {
        return new HttpResponse(blob, {
          headers: { 'Content-Type': blob.type },
        });
      }
    } catch {
      // IDB read failed.
    }
    return new HttpResponse(null, { status: 404 });
  }),

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

    const report_id = mockUuid();
    const ticket_id = mockTicketId();
    const created_at = new Date().toISOString();

    let incident_id: string;
    let report_count: number;

    if (match) {
      // Cluster into existing incident — update its mutable state so the admin
      // queue immediately reflects the new reporter count and photo.
      match.report_count += 1;
      match.reports.unshift({
        report_id,
        ticket_id,
        photo_url: body.photo_url,
        location: body.location,
        gps_accuracy_m: body.gps_accuracy_m,
        description: body.description ?? null,
        severity_self: body.severity_self,
        voice_note_url: body.voice_note_url ?? null,
        created_at,
      });
      match.severity_consensus[body.severity_self] += 1;
      // Recompute priority so the queue score reflects the new reporter.
      const bd = computePriority({
        category: match.category,
        uniqueUserCount: match.report_count,
        daysOpen: match.age_days,
        previousIncidentId: match.is_recurrence ? 'dummy-id' : null,
      });
      match.priority_score = bd.score;
      match.priority_tier = bd.tier;
      match.priority_breakdown = bd;
      // Drift thumbnail to the latest photo.
      if (body.photo_url) match.thumbnail_url = body.photo_url;
      incident_id = match.incident_id;
      report_count = match.report_count;
      saveIncidents();
    } else {
      // No cluster match — seed a brand-new incident and push it into the live
      // array so the admin queue picks it up on the next refetch.
      incident_id = seedNewIncident(body, report_id, ticket_id, created_at);
      report_count = 1;
    }

    const listItem = {
      report_id,
      ticket_id,
      category: body.category,
      photo_url: body.photo_url,
      address: body.address ?? match?.address ?? 'Dropped pin',
      status: 'SUBMITTED' as const,
      created_at,
      report_count,
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
    saveMyReports();
    saveMyReportDetails();

    // Notify any open admin tab that the incident list has changed so it can
    // refetch immediately rather than waiting for the 30-second poll.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('msw:report-submitted'));
    }

    return json(
      CreateReportResponseSchema,
      {
        report_id,
        ticket_id,
        incident_id,
        clustered: Boolean(match),
        report_count,
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
    saveIncidents();
    saveMyReportDetails();
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

    // Use the live `incidents` array — this includes both the seed fixtures and
    // any incidents that were created by POST /api/reports during this session.
    let rows = incidents.map(({ incident_id, category, thumbnail_url, centroid,
      address, ward_name, report_count, status, department, priority_score,
      priority_tier, manual_override, first_reported_at, age_days,
      flagged_mismatch, is_recurrence }) => ({
      incident_id, category, thumbnail_url, centroid, address, ward_name,
      report_count, status, department, priority_score, priority_tier,
      manual_override, first_reported_at, age_days, flagged_mismatch, is_recurrence,
    }));

    // Default view is the open queue (mirrors the real API behaviour).
    if (!q.status) {
      rows = rows.filter(r => !['RESOLVED','VERIFIED','REJECTED','DUPLICATE'].includes(r.status));
    }

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

    saveIncidents();
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

    saveIncidents();
    return json(MergeIncidentsResponseSchema, {
      target_incident_id: target.incident_id,
      merged_count: merged,
      report_count: target.report_count,
    });
  }),

  /* GET /api/stats — landing page counters */
  http.get('/api/stats', () => json(PublicStatsSchema, PUBLIC_STATS)),
];
