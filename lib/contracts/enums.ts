/**
 * Frozen enums — the single definition for all five workstreams.
 *
 * Ratified by .claude/decisions/004. Tables and rationale live in
 * .claude/context/ENUMS.md. Changing a member here requires a new decision file:
 * a mismatched string enum fails at runtime, not at compile time, so a silent
 * change breaks four people at once.
 *
 * Nobody redeclares these unions in their own file. Import from here.
 *
 * Owner: E (integration).
 */
import { z } from 'zod';

/* ── Category — 9 members ─────────────────────────────────────────────────── */

export const CATEGORIES = [
  'STRUCTURAL',
  'ELECTRICAL',
  'DRAIN_MANHOLE',
  'WATER_LEAK',
  'POTHOLE',
  'FOOTPATH',
  'GARBAGE',
  'STREETLIGHT',
  'OTHER',
] as const;

export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

/** Tile labels for the citizen category grid (PRD §9.3 step 2). 9 = a 3×3 grid. */
export const CATEGORY_LABEL: Record<Category, string> = {
  STRUCTURAL: 'Bridge / structure',
  ELECTRICAL: 'Exposed wiring',
  DRAIN_MANHOLE: 'Drain / manhole',
  WATER_LEAK: 'Water leak',
  POTHOLE: 'Pothole',
  FOOTPATH: 'Footpath',
  GARBAGE: 'Garbage',
  STREETLIGHT: 'Streetlight',
  OTHER: 'Other',
};

/* ── Status — 9 members ───────────────────────────────────────────────────── */

export const STATUSES = [
  'SUBMITTED',
  'ACKNOWLEDGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'VERIFIED',
  'REOPENED',
  'REJECTED',
  'DUPLICATE',
] as const;

export const StatusSchema = z.enum(STATUSES);
export type Status = z.infer<typeof StatusSchema>;

/**
 * Legal status transitions (ENUMS.md). The API rejects anything not listed here;
 * the admin UI should grey out anything unreachable from the current status.
 */
export const STATUS_TRANSITIONS: Record<Status, readonly Status[]> = {
  SUBMITTED: ['ACKNOWLEDGED', 'REJECTED', 'DUPLICATE'],
  ACKNOWLEDGED: ['ASSIGNED', 'REJECTED', 'DUPLICATE'],
  ASSIGNED: ['IN_PROGRESS', 'ACKNOWLEDGED', 'REJECTED', 'DUPLICATE'],
  IN_PROGRESS: ['RESOLVED', 'ASSIGNED', 'REJECTED', 'DUPLICATE'],
  RESOLVED: ['VERIFIED', 'REOPENED'],
  VERIFIED: [],
  REOPENED: ['ASSIGNED', 'IN_PROGRESS', 'REJECTED', 'DUPLICATE'],
  REJECTED: [],
  DUPLICATE: [],
};

export function canTransition(from: Status, to: Status): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/** Statuses an incident can no longer move out of. */
export const TERMINAL_STATUSES = ['VERIFIED', 'REJECTED', 'DUPLICATE'] as const;

/**
 * Clustering must never absorb a report into one of these — PRD §6 says create a
 * new incident and set previous_incident_id, which is what makes recurrence
 * chains detectable.
 */
export const CLOSED_TO_CLUSTERING = [
  'RESOLVED',
  'VERIFIED',
  'REJECTED',
  'DUPLICATE',
] as const;

/* ── Departments — 4 members ──────────────────────────────────────────────── */

export const DEPARTMENTS = [
  'SANITATION',
  'PUBLIC_WORKS',
  'ELECTRICAL',
  'WATER_DRAINAGE',
] as const;

export const DepartmentSchema = z.enum(DEPARTMENTS);
export type Department = z.infer<typeof DepartmentSchema>;

export const DEPARTMENT_LABEL: Record<Department, string> = {
  SANITATION: 'Sanitation',
  PUBLIC_WORKS: 'Public Works',
  ELECTRICAL: 'Electrical',
  WATER_DRAINAGE: 'Water & Drainage',
};

/**
 * Routing engine layer 1 — the deterministic category → department lookup
 * (PRD §8). `null` means the triage queue: no department owns it, a human picks.
 * C owns the logic that consumes this; the table itself is frozen with the enums.
 */
export const CATEGORY_DEPARTMENT: Record<Category, Department | null> = {
  STRUCTURAL: 'PUBLIC_WORKS',
  ELECTRICAL: 'ELECTRICAL',
  DRAIN_MANHOLE: 'WATER_DRAINAGE',
  WATER_LEAK: 'WATER_DRAINAGE',
  POTHOLE: 'PUBLIC_WORKS',
  FOOTPATH: 'PUBLIC_WORKS',
  GARBAGE: 'SANITATION',
  STREETLIGHT: 'ELECTRICAL',
  OTHER: null,
};

/* ── Roles — 4 members ────────────────────────────────────────────────────── */

export const ROLES = ['CITIZEN', 'FIELD_STAFF', 'DEPT_HEAD', 'SUPER_ADMIN'] as const;

export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

/* ── Severity self-report — advisory only ─────────────────────────────────── */

/**
 * The citizen's own read (PRD §9.3 step 4). Decision 004: this is collected and
 * displayed as reporter consensus, but it does NOT feed the priority score. Do
 * not add it to the formula without a decision file — the breakdown panel has to
 * stay defensible to admins.
 */
export const SEVERITY_SELF = ['MINOR', 'MODERATE', 'SEVERE'] as const;

export const SeveritySelfSchema = z.enum(SEVERITY_SELF);
export type SeveritySelf = z.infer<typeof SeveritySelfSchema>;

/* ── Priority tiers — UI colour bands only ────────────────────────────────── */

export const PRIORITY_TIERS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const PriorityTierSchema = z.enum(PRIORITY_TIERS);
export type PriorityTier = z.infer<typeof PriorityTierSchema>;

/**
 * PROVISIONAL — excluded from the enum freeze. Decision 003 requires re-checking
 * these against the 500 seeded reports before they are trusted. They are derived
 * from the formula's real ceiling of 39.4, not from round numbers: a CRITICAL
 * cutoff at 40 could never fire.
 *
 * The score is the ranking. These bands are for colour only — never sort by tier.
 */
export const PRIORITY_TIER_THRESHOLD = {
  CRITICAL: 20,
  HIGH: 14,
  MEDIUM: 8,
} as const;

export function priorityTier(score: number): PriorityTier {
  if (score >= PRIORITY_TIER_THRESHOLD.CRITICAL) return 'CRITICAL';
  if (score >= PRIORITY_TIER_THRESHOLD.HIGH) return 'HIGH';
  if (score >= PRIORITY_TIER_THRESHOLD.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/* ── Priority formula weights ─────────────────────────────────────────────── */

/**
 * P = w1·S_cat + w2·ln(1 + N_users) + w3·D_open + w4·B_recur   (PRD §7)
 *
 * Starting values; tune once real data exists. C owns the scorer that uses them.
 */
export const PRIORITY_WEIGHTS = {
  severity: 1.0,
  reports: 2.0,
  age: 0.5,
  recurrence: 1.0,
} as const;

/** B_recur: 0 for a new location, 2 when previous_incident_id is set. */
export const RECURRENCE_BONUS = 2;

/**
 * Seed row for the `category_severity` table. PRD §7 is explicit that severity is
 * configuration, not code — municipalities weight differently and it must be
 * editable in admin settings. Read the table at runtime; these values only seed it.
 */
export const CATEGORY_SEVERITY_SEED: Record<Category, number> = {
  STRUCTURAL: 10,
  ELECTRICAL: 9,
  DRAIN_MANHOLE: 9,
  WATER_LEAK: 7,
  POTHOLE: 6,
  FOOTPATH: 4,
  GARBAGE: 3,
  STREETLIGHT: 2,
  OTHER: 2,
};

/* ── Clustering and limits ────────────────────────────────────────────────── */

/** R = CLUSTER_BASE_RADIUS_M + report.gps_accuracy_m  (PRD §6). */
export const CLUSTER_BASE_RADIUS_M = 35;

/** Max reports per user per hour, enforced at the API layer (PRD §7). */
export const REPORT_RATE_LIMIT_PER_HOUR = 10;

/** Share of reporters clicking "not fixed" that auto-reopens an incident (PRD §10.6). */
export const REOPEN_THRESHOLD = 0.4;
