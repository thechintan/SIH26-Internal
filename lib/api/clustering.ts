/**
 * Interim clustering — B's placeholder for C's engine.
 *
 * ⚠ This belongs to workstream C. It lives here only because `lib/engine/**` is
 * unclaimed and the ingest endpoint cannot return a truthful "N others reported
 * this" without it. When C lands `lib/engine`, this file is deleted and
 * `clusterReport` is imported from there — the signature below is the seam, so
 * the swap is a one-line import change in reports.ts. Do not evolve both.
 *
 * Implements PRD §6 exactly:
 *   1. r = incoming report
 *   2. R = 35 + r.gps_accuracy_m
 *   3. nearest open incident, same category, within R
 *   4. match  → join, record the reporter, recompute the centroid
 *   5. else   → new incident, linked to any previously closed one at this spot
 *   6. enqueue for rescoring (the cron picks it up; nothing is scored here)
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CATEGORY_DEPARTMENT,
  CLUSTER_BASE_RADIUS_M,
  type Category,
} from '../contracts/enums';
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
  const radius = CLUSTER_BASE_RADIUS_M + input.gpsAccuracyM;

  const { data: nearby, error: nearbyErr } = await db.rpc('find_nearby_open_incident', {
    p_category: input.category,
    p_lat: input.location.lat,
    p_lng: input.location.lng,
    p_radius_m: radius,
  });
  if (nearbyErr) throw new Error(`clustering lookup failed: ${nearbyErr.message}`);

  let incidentId: string | undefined = nearby?.[0]?.incident_id;
  const clustered = Boolean(incidentId);

  if (!incidentId) {
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

    const { data: created, error: createErr } = await db
      .from('incidents')
      .insert({
        category: input.category,
        centroid: `POINT(${input.location.lng} ${input.location.lat})`,
        address: input.address ?? null,
        ward_id: ward ?? null,
        // Routing layer 1: deterministic lookup. Null means the triage queue.
        department: CATEGORY_DEPARTMENT[input.category],
        status: 'SUBMITTED',
        previous_incident_id: previous ?? null,
      })
      .select('id')
      .single();
    if (createErr || !created?.id) {
      throw new Error(`incident insert failed: ${createErr?.message ?? 'no row returned'}`);
    }
    incidentId = created.id as string;
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
    // happened to report first.
    await db.rpc('recompute_centroid', { p_incident_id: incidentId });
  }

  // report_count is maintained by a trigger on incident_reporters, so read it
  // back rather than computing it here — two sources for one number is how they
  // end up disagreeing.
  const { data: incident, error: readErr } = await db
    .from('incidents')
    .select('report_count')
    .eq('id', incidentId)
    .single();
  if (readErr) throw new Error(`report count read failed: ${readErr.message}`);

  return {
    incidentId,
    clustered,
    reportCount: incident.report_count as number,
  };
}
