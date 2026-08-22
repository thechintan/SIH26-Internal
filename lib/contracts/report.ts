/**
 * Report contracts — the citizen side.
 *
 * A *report* is one citizen submission. It is not an incident. The citizen never
 * sees an incident id; they see their report and, on the confirmation screen,
 * how many other people reported the same thing.
 *
 * Endpoints: POST /api/reports, GET /api/my-reports, GET /api/reports/{id},
 * POST /api/reports/{id}/verify
 *
 * Owner: E (integration). Consumers: A (citizen app), B (API).
 */
import { z } from 'zod';
import {
  CategorySchema,
  SeveritySelfSchema,
  StatusSchema,
  DepartmentSchema,
} from './enums';
import {
  GeoPointSchema,
  GpsAccuracySchema,
  TicketIdSchema,
  TimestampSchema,
  UuidSchema,
  paged,
} from './common';

/* ── POST /api/reports ────────────────────────────────────────────────────── */

export const CreateReportRequestSchema = z.object({
  category: CategorySchema,

  /**
   * Supabase Storage path returned by the presigned upload, NOT a data URI and
   * not a blob. The browser uploads directly to storage first, then submits this.
   */
  photo_url: z.string().min(1),

  location: GeoPointSchema,
  gps_accuracy_m: GpsAccuracySchema,

  /**
   * Reverse-geocoded on the client — OSM Nominatim is free and needs no key, and
   * doing it client-side keeps the geocode off the ingest path. Optional: a
   * citizen who denied location permission and dropped a pin manually may not
   * have one, and the report is still valid without it.
   */
  address: z.string().max(300).optional(),

  /** PRD §9.3 step 4 — optional and skippable, hard cap 140 chars. */
  description: z.string().max(140).optional(),

  severity_self: SeveritySelfSchema,

  /**
   * Decision 004: reserved now, no UI in v1. Present from the start so switching
   * voice notes on later is not a breaking contract change.
   */
  voice_note_url: z.string().nullable().optional(),

  /** Rate limiting signal (PRD §7). A generates it client-side and persists it. */
  device_fingerprint: z.string().min(8).max(128),
});
export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;

/**
 * The confirmation screen renders this.
 *
 * `clustered` + `report_count` is the load-bearing part: PRD §9.3 says a
 * duplicate report has to feel like a contribution, or people stop submitting —
 * and duplication is exactly what feeds the priority signal. A must show
 * "N others reported this too" whenever clustered is true.
 */
export const CreateReportResponseSchema = z.object({
  report_id: UuidSchema,
  ticket_id: TicketIdSchema,

  /** The incident this report joined or seeded. Internal — do not surface it. */
  incident_id: UuidSchema,

  /** True when the report joined an existing incident rather than seeding one. */
  clustered: z.boolean(),

  /** Unique reporters on that incident, this one included. Never a row count. */
  report_count: z.number().int().positive(),

  status: StatusSchema,
  created_at: TimestampSchema,
});
export type CreateReportResponse = z.infer<typeof CreateReportResponseSchema>;

/* ── GET /api/my-reports ──────────────────────────────────────────────────── */

/** One card in the citizen's report list. */
export const MyReportListItemSchema = z.object({
  report_id: UuidSchema,
  ticket_id: TicketIdSchema,
  category: CategorySchema,
  photo_url: z.string(),
  address: z.string(),
  status: StatusSchema,
  created_at: TimestampSchema,

  /** How many unique citizens reported the same problem. Drives the social proof line. */
  report_count: z.number().int().positive(),

  /** Set once the incident is resolved — enables the verification prompt. */
  awaiting_verification: z.boolean(),
});
export type MyReportListItem = z.infer<typeof MyReportListItemSchema>;

export const MyReportsResponseSchema = paged(MyReportListItemSchema);
export type MyReportsResponse = z.infer<typeof MyReportsResponseSchema>;

/* ── GET /api/reports/{id} — the tracking timeline ────────────────────────── */

/**
 * One row of the status timeline (PRD §9.4). Derived from status_history on the
 * incident, filtered to what a citizen is allowed to see: no crew names, no
 * internal notes.
 */
export const TimelineEntrySchema = z.object({
  status: StatusSchema,
  at: TimestampSchema,
  /** e.g. "Public Works" — shown next to ACKNOWLEDGED. */
  department: DepartmentSchema.nullable(),
  /** Public-safe note only. Never an internal admin comment. */
  note: z.string().nullable(),
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

export const ReportDetailSchema = MyReportListItemSchema.extend({
  location: GeoPointSchema,
  description: z.string().nullable(),
  severity_self: SeveritySelfSchema,
  voice_note_url: z.string().nullable(),

  /** Chronological, oldest first. Statuses not yet reached are simply absent. */
  timeline: z.array(TimelineEntrySchema),

  /** Proof-of-work photo, mandatory before an incident can be RESOLVED. */
  resolution_photo_url: z.string().nullable(),

  /** Null until this citizen answers "was this actually fixed?". */
  verified_by_me: z.boolean().nullable(),
});
export type ReportDetail = z.infer<typeof ReportDetailSchema>;

/* ── POST /api/reports/{id}/verify ────────────────────────────────────────── */

/**
 * The "was this actually fixed?" prompt (PRD §9.4).
 *
 * The No path is load-bearing: without citizen verification a department can
 * close an incident without doing the work and the analytics become fiction.
 * `fixed: false` moves the incident to REOPENED, and once more than 40% of its
 * reporters say no it auto-reopens and flags the department head.
 */
export const VerifyReportRequestSchema = z.object({
  fixed: z.boolean(),
  note: z.string().max(140).optional(),
});
export type VerifyReportRequest = z.infer<typeof VerifyReportRequestSchema>;

export const VerifyReportResponseSchema = z.object({
  report_id: UuidSchema,
  /** Incident status after the vote was counted. */
  incident_status: StatusSchema,
  reopened: z.boolean(),
});
export type VerifyReportResponse = z.infer<typeof VerifyReportResponseSchema>;
