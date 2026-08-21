/**
 * Incident contracts — the admin side.
 *
 * An *incident* is one real-world problem, aggregating N reports of the same
 * category at the same place. This is the admin's work unit. The admin queue
 * must never list raw reports — fifty people photographing one pothole produce
 * one row here, not fifty. That claim is the product.
 *
 * Endpoints: GET /api/incidents, GET /api/incidents/{id},
 * PATCH /api/incidents/{id}, POST /api/incidents/merge
 *
 * Owner: E (integration). Consumers: D (admin + field), B (API), C (engine).
 *
 * ⚠ PROVISIONAL — workstreams C and D are unclaimed as of 2026-08-22. The
 * breakdown shape below is E's proposal, not C's published shape, and the list
 * envelope has not been confirmed by D. Both are marked at their definitions.
 */
import { z } from 'zod';
import {
  CategorySchema,
  DepartmentSchema,
  PriorityTierSchema,
  SeveritySelfSchema,
  StatusSchema,
} from './enums';
import {
  GeoPointSchema,
  PageQuerySchema,
  TicketIdSchema,
  TimestampSchema,
  UuidSchema,
  paged,
} from './common';

/* ── Priority breakdown ───────────────────────────────────────────────────── */

/**
 * ⚠ PROVISIONAL — awaiting C. Stored in incidents.priority_breakdown (jsonb).
 *
 * This renders the breakdown panel, which PRD §10.4 calls non-negotiable: an
 * admin who cannot see why something ranks high will not trust the ranking and
 * will fall back to sorting by date, which makes the whole engine decorative.
 *
 * Each term is the weighted contribution, already multiplied — D renders these
 * verbatim and does not re-derive anything. The raw inputs travel alongside so
 * the panel can label a row "Reports (12 users)" without a second query.
 *
 * P = w1·S_cat + w2·ln(1 + N_users) + w3·D_open + w4·B_recur   (PRD §7)
 */
export const PriorityBreakdownSchema = z.object({
  severity: z.object({
    /** S_cat from the category_severity table, not from code. */
    input: z.number(),
    weighted: z.number(),
  }),
  reports: z.object({
    /** N_users — unique reporters. The log is what stops one viral issue starving the queue. */
    input: z.number().int().nonnegative(),
    weighted: z.number(),
  }),
  age: z.object({
    /** D_open in days. The anti-starvation term: a minor issue open 3 weeks should rise. */
    input: z.number(),
    weighted: z.number(),
  }),
  recurrence: z.object({
    /** B_recur — 0 for a new location, 2 when this location has failed before. */
    input: z.number(),
    weighted: z.number(),
  }),
  total: z.number(),
  computed_at: TimestampSchema,
});
export type PriorityBreakdown = z.infer<typeof PriorityBreakdownSchema>;

/* ── GET /api/incidents — the ranked queue ────────────────────────────────── */

/** One row in the command-centre queue (PRD §10.3). */
export const IncidentSummarySchema = z.object({
  incident_id: UuidSchema,
  category: CategorySchema,

  /** Most recent report photo on this incident. */
  thumbnail_url: z.string().nullable(),

  centroid: GeoPointSchema,
  address: z.string(),
  ward_name: z.string().nullable(),

  /** Unique reporters, from incident_reporters. Never a raw row count. */
  report_count: z.number().int().positive(),

  status: StatusSchema,
  department: DepartmentSchema.nullable(),

  /**
   * Written by the cron every 5 minutes, never computed on page load. The queue
   * reads ORDER BY priority_score DESC against a partial index — that is what
   * keeps it instant at 100k rows.
   */
  priority_score: z.number(),
  /** Colour band only. Sort by the score, never by the tier. */
  priority_tier: PriorityTierSchema,
  /** True when an admin pinned the score and the auto-scorer is skipping this row. */
  manual_override: z.boolean(),

  first_reported_at: TimestampSchema,
  age_days: z.number(),

  /** Image model disagreed with the citizen's category — surface for review, never auto-override. */
  flagged_mismatch: z.boolean(),
  /** Set when this location has failed before. Recurrence, not a one-off. */
  is_recurrence: z.boolean(),
});
export type IncidentSummary = z.infer<typeof IncidentSummarySchema>;

/** ⚠ PROVISIONAL — cursor paging, pending D's confirmation. */
export const IncidentListResponseSchema = paged(IncidentSummarySchema);
export type IncidentListResponse = z.infer<typeof IncidentListResponseSchema>;

export const INCIDENT_SORTS = [
  'priority',
  'newest',
  'oldest',
  'most_reported',
] as const;

export const IncidentListQuerySchema = PageQuerySchema.extend({
  category: CategorySchema.optional(),
  status: StatusSchema.optional(),
  department: DepartmentSchema.optional(),
  ward_id: UuidSchema.optional(),
  priority_tier: PriorityTierSchema.optional(),
  flagged_mismatch: z.coerce.boolean().optional(),
  from: TimestampSchema.optional(),
  to: TimestampSchema.optional(),
  sort: z.enum(INCIDENT_SORTS).default('priority'),
});
export type IncidentListQuery = z.infer<typeof IncidentListQuerySchema>;

/* ── GET /api/incidents/{id} ──────────────────────────────────────────────── */

/** One contributing report, shown in the photo gallery and the scatter overlay. */
export const IncidentReportSchema = z.object({
  report_id: UuidSchema,
  ticket_id: TicketIdSchema,
  photo_url: z.string(),
  location: GeoPointSchema,
  gps_accuracy_m: z.number(),
  description: z.string().nullable(),
  severity_self: SeveritySelfSchema,
  voice_note_url: z.string().nullable(),
  created_at: TimestampSchema,
});
export type IncidentReport = z.infer<typeof IncidentReportSchema>;

export const StatusHistoryEntrySchema = z.object({
  from_status: StatusSchema.nullable(),
  to_status: StatusSchema,
  at: TimestampSchema,
  actor_name: z.string().nullable(),
  note: z.string().nullable(),
});
export type StatusHistoryEntry = z.infer<typeof StatusHistoryEntrySchema>;

export const IncidentDetailSchema = IncidentSummarySchema.extend({
  priority_breakdown: PriorityBreakdownSchema.nullable(),

  /** Every report on this incident. Individual photos and pins, not the work unit. */
  reports: z.array(IncidentReportSchema),

  /**
   * Reporter consensus on severity_self. Advisory only — decision 004 keeps this
   * out of the priority formula.
   */
  severity_consensus: z.object({
    MINOR: z.number().int().nonnegative(),
    MODERATE: z.number().int().nonnegative(),
    SEVERE: z.number().int().nonnegative(),
  }),

  status_history: z.array(StatusHistoryEntrySchema),

  assigned_to: z
    .object({ user_id: UuidSchema, name: z.string() })
    .nullable(),
  sla_due_at: TimestampSchema.nullable(),

  /** Walks back through previous_incident_id. 3+ links means replace, not patch. */
  recurrence_chain: z.array(
    z.object({
      incident_id: UuidSchema,
      first_reported_at: TimestampSchema,
      resolved_at: TimestampSchema.nullable(),
    }),
  ),

  resolved_at: TimestampSchema.nullable(),
  resolution_photo_url: z.string().nullable(),

  /** Citizen verification tally once resolved. Feeds the auto-reopen threshold. */
  verification: z.object({
    fixed: z.number().int().nonnegative(),
    not_fixed: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
  }),
});
export type IncidentDetail = z.infer<typeof IncidentDetailSchema>;

/* ── PATCH /api/incidents/{id} ────────────────────────────────────────────── */

/**
 * Every admin action on an incident. All fields optional; at least one required.
 * B validates status moves against STATUS_TRANSITIONS and rejects anything else
 * with ILLEGAL_TRANSITION.
 */
export const UpdateIncidentRequestSchema = z
  .object({
    status: StatusSchema.optional(),
    department: DepartmentSchema.optional(),
    assigned_to: UuidSchema.nullable().optional(),
    sla_due_at: TimestampSchema.nullable().optional(),

    /**
     * Setting this pins the score: manual_override flips true and the cron skips
     * the row until it is cleared. Send null to hand the row back to the scorer.
     */
    priority_score: z.number().nullable().optional(),

    /** Mandatory before IN_PROGRESS → RESOLVED. Proof of work (PRD §10.6). */
    resolution_photo_url: z.string().optional(),

    note: z.string().max(500).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateIncidentRequest = z.infer<typeof UpdateIncidentRequestSchema>;

/* ── POST /api/incidents/merge ────────────────────────────────────────────── */

/**
 * Admin merge (PRD §6). A 60m stretch of broken road fragments into 2–3
 * incidents; merging is far cheaper than road-network-aware clustering. Reports
 * move to the target, incident_reporters is unioned so report_count stays a
 * unique-user count, and the sources become DUPLICATE.
 */
export const MergeIncidentsRequestSchema = z.object({
  target_incident_id: UuidSchema,
  source_incident_ids: z.array(UuidSchema).min(1),
  note: z.string().max(500).optional(),
});
export type MergeIncidentsRequest = z.infer<typeof MergeIncidentsRequestSchema>;

export const MergeIncidentsResponseSchema = z.object({
  target_incident_id: UuidSchema,
  merged_count: z.number().int().positive(),
  /** Recomputed unique-user count after the union. */
  report_count: z.number().int().positive(),
});
export type MergeIncidentsResponse = z.infer<typeof MergeIncidentsResponseSchema>;

/* ── GET /api/stats — landing page counters (PRD §9.1) ────────────────────── */

export const PublicStatsSchema = z.object({
  reports_total: z.number().int().nonnegative(),
  incidents_total: z.number().int().nonnegative(),
  resolved_total: z.number().int().nonnegative(),
});
export type PublicStats = z.infer<typeof PublicStatsSchema>;
