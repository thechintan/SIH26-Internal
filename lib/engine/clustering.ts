/**
 * CivicReport — Clustering Engine (Pure Logic)
 *
 * Implements the clustering decision logic from PRD §6.
 * The actual PostGIS queries (ST_DWithin, ST_Distance) are abstracted
 * behind a `ClusteringQuery` interface — they'll be implemented when
 * Person B's schema and seed data are ready.
 *
 * Algorithm (PRD §6):
 * 1. r = incoming report
 * 2. R = 35 + r.gps_accuracy_m  (adaptive radius, metres)
 * 3. Find nearest open incident: same category, within R metres
 * 4. If match: attach report, update centroid + reporter count
 * 5. Else: create new incident seeded from the report
 * 6. Enqueue incident for rescoring
 *
 * RULES:
 * - Never cluster across categories
 * - Never cluster into a RESOLVED incident (create new, set previous_incident_id)
 * - Adaptive radius compensates for browser GPS inaccuracy
 */

import {
  type Category,
  type Status,
  type GeoPoint,
  type ClusteringResult,
  StatusEnum,
  OPEN_STATUSES,
} from './types';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Base clustering radius in metres (PRD §6: R = 35 + gps_accuracy_m) */
const BASE_RADIUS_M = 35;

// ─── Adaptive Radius ────────────────────────────────────────────────────────

/**
 * Compute the adaptive clustering radius for a report.
 *
 * PRD §6: R = 35 + r.gps_accuracy_m
 * Browser GPS is materially worse than native — the device-reported
 * accuracy prevents obvious duplicates from being missed in dense areas.
 *
 * @param gpsAccuracyM - The GPS accuracy in metres (from navigator.geolocation)
 * @returns The clustering radius in metres
 */
export function computeAdaptiveRadius(gpsAccuracyM: number): number {
  // Guard against negative accuracy (shouldn't happen, but defensive)
  return BASE_RADIUS_M + Math.max(0, gpsAccuracyM);
}

// ─── Clustering Eligibility ─────────────────────────────────────────────────

/**
 * Check if a candidate incident is eligible for clustering with a report.
 *
 * Two hard rules from PRD §6:
 * 1. Same category — a pothole and a broken streetlight at one corner
 *    are two incidents (correct, not a bug)
 * 2. Not resolved — never cluster into a RESOLVED/VERIFIED/REJECTED/DUPLICATE
 *    incident. Create a new one and set previous_incident_id.
 *
 * @param reportCategory - The incoming report's category
 * @param incidentCategory - The candidate incident's category
 * @param incidentStatus - The candidate incident's status
 * @returns true if clustering is allowed
 */
export function shouldCluster(
  reportCategory: Category,
  incidentCategory: Category,
  incidentStatus: Status,
): boolean {
  // Rule 1: Never cluster across categories
  if (reportCategory !== incidentCategory) {
    return false;
  }

  // Rule 2: Never cluster into a non-open incident
  if (!OPEN_STATUSES.has(incidentStatus)) {
    return false;
  }

  return true;
}

// ─── Centroid Recomputation ─────────────────────────────────────────────────

/**
 * Recompute the centroid as the mean of all member report locations.
 *
 * PRD §6 step 4: "recompute centroid as mean of member report locations"
 *
 * Note: This is a simple arithmetic mean, which is fine for small areas
 * (city-scale). For global-scale, you'd need to account for spherical
 * geometry, but that's not a concern for municipal civic reports.
 *
 * @param locations - Array of report locations (must have at least one)
 * @returns The mean location
 * @throws If locations array is empty
 */
export function recomputeCentroid(locations: readonly GeoPoint[]): GeoPoint {
  if (locations.length === 0) {
    throw new Error('Cannot compute centroid of zero locations');
  }

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

// ─── Distance Calculation (Haversine — for tests without PostGIS) ───────────

/**
 * Approximate distance between two points in metres using the Haversine formula.
 *
 * This is used for unit testing and fallback. In production, ST_Distance
 * from PostGIS handles this with geodesic precision.
 *
 * @param a - First point
 * @param b - Second point
 * @returns Approximate distance in metres
 */
export function haversineDistanceM(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000; // Earth's radius in metres
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// ─── Pure Clustering Decision ───────────────────────────────────────────────

/**
 * Candidate incident returned by the spatial query.
 * In production, this comes from a PostGIS ST_DWithin query.
 */
export interface ClusterCandidate {
  readonly incidentId: string;
  readonly category: Category;
  readonly status: Status;
  readonly centroid: GeoPoint;
  readonly distanceM: number; // distance from report location
}

/**
 * Make the clustering decision for an incoming report.
 *
 * Given a list of candidate incidents (pre-filtered by spatial proximity),
 * determine whether to attach to an existing incident or create a new one.
 *
 * The spatial query itself (ST_DWithin) is NOT in this function — it
 * lives in the DB layer (Person B's territory). This function receives
 * the results and applies the business rules.
 *
 * @param reportCategory - The incoming report's category
 * @param candidates - Nearby incidents returned by spatial query, ordered by distance
 * @returns The clustering decision
 */
export function makeClusteringDecision(
  reportCategory: Category,
  candidates: readonly ClusterCandidate[],
): ClusteringResult {
  // Find the nearest eligible candidate
  for (const candidate of candidates) {
    if (shouldCluster(reportCategory, candidate.category, candidate.status)) {
      return {
        action: 'attach',
        incidentId: candidate.incidentId,
      };
    }
  }

  // No eligible match — create a new incident
  return { action: 'create_new' };
}
