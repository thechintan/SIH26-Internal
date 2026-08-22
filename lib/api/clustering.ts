/**
 * Clustering I/O — the database half of PRD §6.
 *
 * Owner: B (backend). The *decisions* belong to C and live in `lib/engine`:
 * what the adaptive radius is, whether a candidate is eligible, which department
 * a category routes to. This file does the parts an engine of pure functions
 * cannot: run the PostGIS queries, insert the incident, record the reporter,
 * recompute the centroid.
 *
 * That split is C's own design — `lib/engine/clustering.ts` says the spatial
 * queries are abstracted out and belong to B. Nothing here re-decides anything
 * the engine already decides; if you find yourself adding a rule, it goes in
 * `lib/engine` instead.
 *
 *   1. r = incoming report
 *   2. R = computeAdaptiveRadius(r.gps_accuracy_m)          ← engine
 *   3. candidates within R, same category, nearest first    ← here (PostGIS)
 *   4. makeClusteringDecision(category, candidates)         ← engine
 *   5. attach, or seed a new incident linked to any prior failure at this spot
 *   6. the rescoring cron picks it up; nothing is scored on this path
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeAdaptiveRadius,
  makeClusteringDecision,
  routeToDepartment,
  type ClusterCandidate,
} from '../engine';
import type { Category } from '../contracts/enums';
import type { GeoPoint } from '../contracts/common';

export type ClusterInput = {
  category: Category;
  location: GeoPoint;
  gpsAccuracyM: number;
  address?: string;
  userId: string;
};

export type ClusterResult = {
  incidentId: string;
  /** True when the report joined an existing incident rather than seeding one. */
  clustered: boolean;
  /** Unique reporters after this one was counted. */
  reportCount: number;
};

/** Shape of the find_nearby_open_incident RPC result. */
type NearbyRow = {
  incident_id: string;
  distance_m: number;
  status: ClusterCandidate['status'];
  report_count: number;
};

/**
 * Runs inside the ingest request rather than on a queue.
 *
 * The confirmation screen has to say "12 others reported this too" in the same
 * response, and PRD §9.3 is explicit that this message is what makes a duplicate
 * report feel like a contribution instead of a waste. Deferring it to a worker
 * would mean showing the citizen nothing at the one moment they are paying
 * attention. The work is two indexed spatial queries — cheap enough to stay on
 * the request path.
 */
export async function clusterReport(
  db: SupabaseClient,
  input: ClusterInput,
): Promise<ClusterResult> {
  const radius = computeAdaptiveRadius(input.gpsAccuracyM);

  // The SQL function already filters to open incidents of the same category and
  // orders by distance. The engine re-checks eligibility anyway — it is the
  // authority on the rule, and a query that quietly changes should not be able
  // to widen it.
  const { data: nearby, error: nearbyErr } = await db.rpc('find_nearby_open_incident', {
    p_category: input.category,
    p_lat: input.location.lat,
    p_lng: input.location.lng,
    p_radius_m: radius,
  });
  if (nearbyErr) throw new Error(`clustering lookup failed: ${nearbyErr.message}`);

  // The RPC is a set-returning function, but supabase-js has no generated types
  // for it, so its result arrives untyped. NearbyRow is the contract with
  // find_nearby_open_incident in 0003_spatial_functions.sql.
  const rows = (nearby ?? []) as NearbyRow[];

  const candidates: ClusterCandidate[] = rows.map((row) => ({
    incidentId: row.incident_id,
    category: input.category,
    status: row.status,
    centroid: input.location,
    distanceM: row.distance_m,
  }));

  const decision = makeClusteringDecision(input.category, candidates);
  const clustered = decision.action === 'attach';

  let incidentId: string;

  if (clustered && decision.incidentId) {
    incidentId = decision.incidentId;
  } else {
    // Nothing open nearby. Before seeding, check whether this exact spot has
    // failed before — that link is the entire recurrence-chain feature, and it
    // can only be established at creation time. A wider radius on purpose: a
    // pothole patched last monsoon and reopening now is the same infrastructure
    // failure even if the centroid has drifted.
    const { data: previous } = await db.rpc('find_previous_closed_incident', {
      p_category: input.category,
      p_lat: input.location.lat,
      p_lng: input.location.lng,
      p_radius_m: radius * 2,
    });

    const { data: ward } = await db.rpc('ward_for_point', {
      p_lat: input.location.lat,
      p_lng: input.location.lng,
    });

    // Routing layer 1 (PRD §8), decided by the engine. Null means triage.
    const routing = routeToDepartment(input.category);

    const { data: created, error: createErr } = await db
      .from('incidents')
      .insert({
        category: input.category,
        centroid: `POINT(${input.location.lng} ${input.location.lat})`,
        address: input.address ?? null,
        ward_id: ward ?? null,
        department: routing.department,
        status: 'SUBMITTED',
        previous_incident_id: previous ?? null,
      })
      .select('id')
      .single<{ id: string }>();
    if (createErr || !created?.id) {
      throw new Error(`incident insert failed: ${createErr?.message ?? 'no row returned'}`);
    }
    incidentId = created.id;
  }

  // Unique-user counting. The composite primary key makes a repeat submission
  // from the same person a no-op, which is the whole reason this table exists —
  // report_count must be a number a spammer cannot move.
  const { error: reporterErr } = await db
    .from('incident_reporters')
    .upsert(
      { incident_id: incidentId, user_id: input.userId },
      { onConflict: 'incident_id,user_id', ignoreDuplicates: true },
    );
  if (reporterErr) throw new Error(`reporter upsert failed: ${reporterErr.message}`);

  if (clustered) {
    // The centroid is the mean of member reports, so it drifts toward where
    // people are actually standing rather than staying pinned to whoever
    // happened to report first. Done in SQL because the member locations are
    // already there; the engine's recomputeCentroid is for the pure-function
    // path and unit tests.
    await db.rpc('recompute_centroid', { p_incident_id: incidentId });
  }

  // report_count is maintained by a trigger on incident_reporters, so read it
  // back rather than computing it here — two sources for one number is how they
  // end up disagreeing.
  const { data: incident, error: readErr } = await db
    .from('incidents')
    .select('report_count')
    .eq('id', incidentId)
    .single<{ report_count: number }>();
  if (readErr) throw new Error(`report count read failed: ${readErr.message}`);

  return { incidentId, clustered, reportCount: incident.report_count };
}
