/**
 * CivicReport — Engine Types
 *
 * Local type definitions mirroring the frozen enums from ENUMS.md.
 * These will be REPLACED by Person E's Zod schemas in lib/contracts/
 * once they ship. Until then, this is the source of truth for the engine.
 *
 * IMPORTANT: All enum values match ENUMS.md exactly. Changing them
 * requires a new decision file under .claude/decisions/.
 */

import {
  type Category,
  type Status,
  type Department,
  type SeveritySelf as Severity,
  type PriorityTier,
} from '../contracts/enums';

// ─── Status Constants ───────────────────────────────────────────────────────

/** Statuses that count as "open" for clustering purposes */
export const OPEN_STATUSES: ReadonlySet<Status> = new Set<Status>([
  'SUBMITTED',
  'ACKNOWLEDGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'REOPENED',
]);

/** Terminal statuses — no further transitions */
export const TERMINAL_STATUSES: ReadonlySet<Status> = new Set<Status>([
  'VERIFIED',
  'REJECTED',
  'DUPLICATE',
]);

/** Score thresholds — score >= threshold maps to that tier */
export const PRIORITY_THRESHOLDS: Record<
  Exclude<PriorityTier, 'LOW'>,
  number
> = {
  CRITICAL: 20,
  HIGH: 14,
  MEDIUM: 8,
} as const;

export const StatusEnum = {
  SUBMITTED: 'SUBMITTED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  VERIFIED: 'VERIFIED',
  REOPENED: 'REOPENED',
  REJECTED: 'REJECTED',
  DUPLICATE: 'DUPLICATE',
} as const;

export const CategoryEnum = {
  POTHOLE: 'POTHOLE',
  STREETLIGHT: 'STREETLIGHT',
  GARBAGE: 'GARBAGE',
  WATER_LEAK: 'WATER_LEAK',
  FOOTPATH: 'FOOTPATH',
  DRAIN_MANHOLE: 'DRAIN_MANHOLE',
  ELECTRICAL: 'ELECTRICAL',
  STRUCTURAL: 'STRUCTURAL',
  OTHER: 'OTHER',
} as const;

export const PriorityTierEnum = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export const DepartmentEnum = {
  SANITATION: 'SANITATION',
  PUBLIC_WORKS: 'PUBLIC_WORKS',
  ELECTRICAL: 'ELECTRICAL',
  WATER_DRAINAGE: 'WATER_DRAINAGE',
} as const;

export type { Category, Status, Department, Severity, PriorityTier };

// ─── Priority Weights ───────────────────────────────────────────────────────
// PRD §7: starting weights, tunable once real data exists

export interface PriorityWeights {
  /** Weight for category severity (S_cat) */
  readonly w1: number;
  /** Weight for log of report count ln(1 + N_users) */
  readonly w2: number;
  /** Weight for days open (D_open) */
  readonly w3: number;
  /** Weight for recurrence bonus (B_recur) */
  readonly w4: number;
}

export const DEFAULT_WEIGHTS: PriorityWeights = {
  w1: 1.0,
  w2: 2.0,
  w3: 0.5,
  w4: 1.0,
} as const;

// ─── Priority Breakdown ─────────────────────────────────────────────────────
// CONTRACT: Person D renders this in the admin incident detail panel (PRD §10.4).
// We own this shape. Changes here require a Heads Up to D.

export interface PriorityBreakdown {
  /** The final computed score */
  readonly score: number;

  /** Which tier this score falls into */
  readonly tier: PriorityTier;

  /** Per-factor breakdown — what the admin sees to understand WHY */
  readonly factors: {
    /** Category severity contribution: w1 * S_cat */
    readonly severity: {
      readonly category: Category;
      readonly baseSeverity: number;
      readonly weighted: number;
    };
    /** Report count contribution: w2 * ln(1 + N_users) */
    readonly reportCount: {
      readonly uniqueUsers: number;
      readonly logValue: number;
      readonly weighted: number;
    };
    /** Age contribution: w3 * D_open */
    readonly age: {
      readonly daysOpen: number;
      readonly weighted: number;
    };
    /** Recurrence contribution: w4 * B_recur */
    readonly recurrence: {
      readonly isRecurring: boolean;
      readonly bonus: number;
      readonly weighted: number;
    };
  };

  /** Weights used for this computation (for transparency) */
  readonly weights: PriorityWeights;

  /** ISO 8601 timestamp of when this score was computed */
  readonly computedAt: string;
}

// ─── Geo Types ──────────────────────────────────────────────────────────────

export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

// ─── Report (fields the engine touches) ─────────────────────────────────────

export interface EngineReport {
  readonly id: string;
  readonly userId: string;
  readonly incidentId: string | null;
  readonly category: Category;
  readonly location: GeoPoint;
  readonly gpsAccuracyM: number;
  readonly severitySelf: Severity | null;
  readonly createdAt: Date;
}

// ─── Incident (fields the engine touches) ───────────────────────────────────

export interface EngineIncident {
  readonly id: string;
  readonly category: Category;
  readonly centroid: GeoPoint;
  readonly reportCount: number;
  readonly firstReportedAt: Date;
  readonly status: Status;
  readonly departmentId: string | null;
  readonly priorityScore: number;
  readonly priorityBreakdown: PriorityBreakdown | null;
  readonly manualOverride: boolean;
  readonly previousIncidentId: string | null;
  readonly wardId: string | null;
}

// ─── Clustering Types ───────────────────────────────────────────────────────

export type ClusteringResult =
  | {
      readonly action: 'attach';
      readonly incidentId: string;
    }
  | {
      readonly action: 'create_new';
    };

// ─── Merge Types ────────────────────────────────────────────────────────────

export interface MergeValidation {
  readonly valid: boolean;
  readonly reason: string | null;
}

export interface MergedIncidentData {
  /** The surviving incident ID (primary) */
  readonly primaryId: string;
  /** The absorbed incident ID (secondary — to be marked DUPLICATE) */
  readonly secondaryId: string;
  /** Recomputed centroid from all member reports */
  readonly newCentroid: GeoPoint;
  /** Combined unique reporter count */
  readonly newReportCount: number;
  /** Earliest first_reported_at from either incident */
  readonly newFirstReportedAt: Date;
}
