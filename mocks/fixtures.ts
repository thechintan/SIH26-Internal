/**
 * Deterministic fixture data for the MSW layer.
 *
 * Every object here is built to satisfy the Zod contracts in lib/contracts —
 * `npm run verify:mocks` parses all of it through the real schemas, so a mock
 * that drifts from a contract fails loudly instead of silently teaching A and D
 * the wrong shape.
 *
 * Deterministic on purpose: a fixed seed means the demo shows the same incident
 * ranked first every time, and a screenshot taken yesterday still matches.
 *
 * This is NOT the seed script. B's scripts/seed.ts writes 500 reports into real
 * Postgres and is what C's clustering runs against. This file never touches a
 * database and exists only so A and D can build with the API switched off.
 *
 * Owner: E (integration).
 */
import {
  CATEGORIES,
  CATEGORY_DEPARTMENT,
  CATEGORY_SEVERITY_SEED,
  CLUSTER_BASE_RADIUS_M,
  PRIORITY_WEIGHTS,
  RECURRENCE_BONUS,
  priorityTier,
  type Category,
  type Department,
  type SeveritySelf,
  type Status,
} from '../lib/contracts/enums';
import type {
  IncidentDetail,
  IncidentSummary,
  PriorityBreakdown,
  StatusHistoryEntry,
} from '../lib/contracts/incident';
import type {
  MyReportListItem,
  ReportDetail,
  TimelineEntry,
} from '../lib/contracts/report';
import { computePriority } from '../lib/engine';

/* ── deterministic RNG ────────────────────────────────────────────────────── */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260822);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const intBetween = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));

/** Stable pseudo-uuid so fixtures are reproducible across reloads. */
function uuid(): string {
  const hex = (n: number) =>
    Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(rand() * 16)]).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

function ticketId(): string {
  const A = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 5 }, () => A[Math.floor(rand() * A.length)]).join('');
}

const daysAgo = (d: number) =>
  new Date(Date.now() - d * 86_400_000).toISOString();

/* ── geography ────────────────────────────────────────────────────────────── */

/**
 * Demo city centre. One constant — change it here and every mock, map bound and
 * fixture address moves with it. B's seed script has its own copy of this for
 * the real database; keep the two in step or the mock map and the seeded map
 * will show different cities.
 */
export const CITY = { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 };

const STREETS = [
  'Ashram Road', 'CG Road', 'SG Highway', 'Relief Road', 'Nehru Bridge',
  'Law Garden', 'Paldi Cross Road', 'Naranpura Char Rasta', 'Vastrapur Lake Road',
  'Bopal Circle', 'Maninagar Station Road', 'Sabarmati Riverfront',
];

const WARDS = ['Navrangpura', 'Paldi', 'Maninagar', 'Bopal', 'Naranpura', 'Vastrapur'];

/** ~111km per degree of latitude; good enough for a mock at city scale. */
function jitter(lat: number, lng: number, metres: number) {
  const dLat = (between(-metres, metres) / 111_000);
  const dLng = (between(-metres, metres) / (111_000 * Math.cos((lat * Math.PI) / 180)));
  return { lat: lat + dLat, lng: lng + dLng };
}

/* ── priority ─────────────────────────────────────────────────────────────── */

/**
 * The PRD §7 formula, computed once at fixture-build time.
 *
 * Mirrors what C's scorer will do in the real system, purely so D has a
 * realistically-shaped breakdown to render before C lands. When C publishes the
 * real shape, this is deleted, not kept in parallel.
 */
// breakdown function deleted — using computePriority from lib/engine instead.

/* ── builders ─────────────────────────────────────────────────────────────── */

const OPEN_STATUSES: Status[] = [
  'SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS',
];

function photo(category: Category, n: number): string {
  // Deterministic placeholder; swap for real Supabase Storage paths once B lands.
  return `/mock/photos/${category.toLowerCase()}-${n}.jpg`;
}

function makeIncident(i: number): IncidentDetail {
  const category = CATEGORIES[i % CATEGORIES.length] as Category;

  // Long-tailed on purpose. Real report volume is not uniform: most incidents
  // have one or two reporters and a handful go viral. A uniform draw makes
  // almost everything CRITICAL, which hides whether the tier thresholds work
  // and gives D a dashboard that is a wall of red.
  const reporters = 1 + Math.floor(rand() ** 3 * 40);
  const ageDays = Math.round(rand() ** 2 * 26 * 10) / 10;
  const recurring = rand() < 0.18;

  // A resolved incident awaiting citizen verification, roughly one in five.
  const resolved = rand() < 0.2;
  const status: Status = resolved ? 'RESOLVED' : pick(OPEN_STATUSES);

  const centroid = jitter(CITY.lat, CITY.lng, 6000);
  const bd = computePriority({
    category,
    uniqueUserCount: reporters,
    daysOpen: ageDays,
    previousIncidentId: recurring ? 'dummy-id' : null,
  });
  const department: Department | null = CATEGORY_DEPARTMENT[category];
  const address = `${intBetween(1, 240)}, ${pick(STREETS)}`;

  // Individual reports scatter inside the adaptive clustering radius, which is
  // what makes the incident-detail scatter overlay look like real GPS noise.
  const reports = Array.from({ length: Math.min(reporters, 8) }, (_, r) => {
    const accuracy = Math.round(between(5, 45));
    const loc = jitter(centroid.lat, centroid.lng, CLUSTER_BASE_RADIUS_M + accuracy);
    return {
      report_id: uuid(),
      ticket_id: ticketId(),
      photo_url: photo(category, r + 1),
      location: loc,
      gps_accuracy_m: accuracy,
      description: rand() < 0.55 ? 'Getting worse after the rain. Please fix.' : null,
      severity_self: pick(['MINOR', 'MODERATE', 'SEVERE'] as const) as SeveritySelf,
      voice_note_url: null,
      created_at: daysAgo(between(0, ageDays)),
    };
  });

  const consensus = { MINOR: 0, MODERATE: 0, SEVERE: 0 };
  for (const r of reports) consensus[r.severity_self]++;

  const history: StatusHistoryEntry[] = [
    { from_status: null, to_status: 'SUBMITTED', at: daysAgo(ageDays), actor_name: null, note: null },
  ];
  if (status !== 'SUBMITTED') {
    history.push({
      from_status: 'SUBMITTED',
      to_status: 'ACKNOWLEDGED',
      at: daysAgo(ageDays - 0.2),
      actor_name: 'Auto-routing',
      note: department ? `Routed to ${department}` : 'Sent to triage',
    });
  }

  return {
    incident_id: uuid(),
    category,
    thumbnail_url: reports[0]?.photo_url ?? null,
    centroid,
    address,
    ward_name: pick(WARDS),
    report_count: reporters,
    status,
    department,
    priority_score: bd.score,
    priority_tier: bd.tier,
    manual_override: rand() < 0.05,
    first_reported_at: daysAgo(ageDays),
    age_days: ageDays,
    flagged_mismatch: rand() < 0.08,
    is_recurrence: recurring,
    priority_breakdown: bd,
    reports,
    severity_consensus: consensus,
    status_history: history,
    assigned_to:
      status === 'ASSIGNED' || status === 'IN_PROGRESS'
        ? { user_id: uuid(), name: `Crew #${intBetween(1, 9)}` }
        : null,
    sla_due_at: status === 'ASSIGNED' ? daysAgo(-2) : null,
    recurrence_chain: recurring
      ? [{ incident_id: uuid(), first_reported_at: daysAgo(ageDays + 90), resolved_at: daysAgo(ageDays + 60) }]
      : [],
    resolved_at: resolved ? daysAgo(0.5) : null,
    resolution_photo_url: resolved ? photo(category, 99) : null,
    verification: resolved
      ? { fixed: intBetween(0, 5), not_fixed: intBetween(0, 3), pending: intBetween(0, 6) }
      : { fixed: 0, not_fixed: 0, pending: 0 },
  };
}

/** 60 incidents, ranked. Enough to exercise paging, filters and the map. */
export const INCIDENTS: IncidentDetail[] = Array.from({ length: 60 }, (_, i) =>
  makeIncident(i),
).sort((a, b) => b.priority_score - a.priority_score);

export const INCIDENT_SUMMARIES: IncidentSummary[] = INCIDENTS.map(
  ({ priority_breakdown, reports, severity_consensus, status_history, assigned_to,
     sla_due_at, recurrence_chain, resolved_at, resolution_photo_url, verification,
     ...summary }) => summary,
);

/**
 * The signed-in citizen's own reports. Deliberately drawn from incidents that
 * already have other reporters, so the "N others reported this" line and the
 * verification prompt both have something to show on first load.
 */
export const MY_REPORTS: MyReportListItem[] = INCIDENTS.slice(0, 6).map((inc) => {
  const r = inc.reports[0];
  return {
    report_id: r.report_id,
    ticket_id: r.ticket_id,
    category: inc.category,
    photo_url: r.photo_url,
    address: inc.address,
    status: inc.status,
    created_at: r.created_at,
    report_count: inc.report_count,
    awaiting_verification: inc.status === 'RESOLVED',
  };
});

function timelineFor(inc: IncidentDetail): TimelineEntry[] {
  return inc.status_history.map((h) => ({
    status: h.to_status,
    at: h.at,
    department: h.to_status === 'ACKNOWLEDGED' ? inc.department : null,
    note: h.note,
  }));
}

export const MY_REPORT_DETAILS: Record<string, ReportDetail> = Object.fromEntries(
  INCIDENTS.slice(0, 6).map((inc) => {
    const r = inc.reports[0];
    const detail: ReportDetail = {
      report_id: r.report_id,
      ticket_id: r.ticket_id,
      category: inc.category,
      photo_url: r.photo_url,
      address: inc.address,
      status: inc.status,
      created_at: r.created_at,
      report_count: inc.report_count,
      awaiting_verification: inc.status === 'RESOLVED',
      location: r.location,
      description: r.description,
      severity_self: r.severity_self,
      voice_note_url: null,
      timeline: timelineFor(inc),
      resolution_photo_url: inc.resolution_photo_url,
      verified_by_me: null,
    };
    return [detail.report_id, detail];
  }),
);

export const PUBLIC_STATS = {
  reports_total: INCIDENTS.reduce((n, i) => n + i.report_count, 0),
  incidents_total: INCIDENTS.length,
  resolved_total: INCIDENTS.filter((i) => i.status === 'RESOLVED').length,
};

export { computePriority as mockBreakdown, uuid as mockUuid, ticketId as mockTicketId };
