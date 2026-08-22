/**
 * CivicReport — Merge Incidents Logic
 *
 * Admin action for merging two incidents into one.
 *
 * PRD §6 known limitation: "a 60m stretch of broken road may fragment
 * into 2–3 incidents. Mitigation: an admin Merge Incidents action."
 *
 * Merge combines reporters, recomputes centroid, takes the earliest
 * first_reported_at, and marks the secondary incident as DUPLICATE.
 */

import {
  type Category,
  type Status,
  type GeoPoint,
  type MergeValidation,
  type MergedIncidentData,
  StatusEnum,
  TERMINAL_STATUSES,
} from './types';

// ─── Merge Validation ───────────────────────────────────────────────────────

/**
 * Validate whether two incidents can be merged.
 *
 * Rules:
 * - Must be the same category (you wouldn't merge a pothole with a streetlight)
 * - Neither can be in a terminal status (VERIFIED, REJECTED, DUPLICATE)
 * - They must be different incidents (can't merge with yourself)
 *
 * @param primary - The incident that survives
 * @param secondary - The incident that gets absorbed
 * @returns Validation result with reason if invalid
 */
export function validateMerge(
  primary: {
    readonly id: string;
    readonly category: Category;
    readonly status: Status;
  },
  secondary: {
    readonly id: string;
    readonly category: Category;
    readonly status: Status;
  },
): MergeValidation {
  if (primary.id === secondary.id) {
    return { valid: false, reason: 'Cannot merge an incident with itself' };
  }

  if (primary.category !== secondary.category) {
    return {
      valid: false,
      reason: `Category mismatch: "${primary.category}" vs "${secondary.category}". Only same-category incidents can be merged.`,
    };
  }

  if (TERMINAL_STATUSES.has(primary.status)) {
    return {
      valid: false,
      reason: `Primary incident is in terminal status "${primary.status}" and cannot be modified`,
    };
  }

  if (TERMINAL_STATUSES.has(secondary.status)) {
    return {
      valid: false,
      reason: `Secondary incident is in terminal status "${secondary.status}" and cannot be merged`,
    };
  }

  return { valid: true, reason: null };
}

// ─── Merge Computation ──────────────────────────────────────────────────────

/**
 * Compute the merged incident data.
 *
 * This produces the values to write to the primary incident.
 * The secondary incident should be marked as DUPLICATE after merge.
 *
 * The caller is responsible for:
 * - Reassigning all reports from secondary → primary
 * - Merging the incident_reporters join table (deduplicating users)
 * - Updating the primary incident with the returned values
 * - Setting secondary.status = DUPLICATE
 *
 * @param primary - The surviving incident
 * @param secondary - The absorbed incident
 * @param allReportLocations - Locations of ALL reports from both incidents
 * @param combinedUniqueReporters - Deduplicated count of unique reporters across both
 */
export function computeMerge(
  primary: {
    readonly id: string;
    readonly firstReportedAt: Date;
  },
  secondary: {
    readonly id: string;
    readonly firstReportedAt: Date;
  },
  allReportLocations: readonly GeoPoint[],
  combinedUniqueReporters: number,
): MergedIncidentData {
  if (allReportLocations.length === 0) {
    throw new Error('Cannot merge incidents with no report locations');
  }

  // Recompute centroid from all report locations
  const newCentroid = computeMergeCentroid(allReportLocations);

  // Take the earliest first_reported_at
  const newFirstReportedAt =
    primary.firstReportedAt <= secondary.firstReportedAt
      ? primary.firstReportedAt
      : secondary.firstReportedAt;

  return {
    primaryId: primary.id,
    secondaryId: secondary.id,
    newCentroid,
    newReportCount: combinedUniqueReporters,
    newFirstReportedAt,
  };
}

/**
 * Compute the centroid of merged report locations.
 * Same arithmetic mean as clustering — at city scale this is fine.
 */
function computeMergeCentroid(locations: readonly GeoPoint[]): GeoPoint {
  const sum = locations.reduce(
    (acc, loc) => ({
      lat: acc.lat + loc.lat,
      lng: acc.lng + loc.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: sum.lat / locations.length,
    lng: sum.lng / locations.length,
  };
}
