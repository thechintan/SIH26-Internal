/**
 * CivicReport — Rescoring Service
 *
 * Reads all open incidents from the database, computes priority scores using
 * the engine's pure `computePriority`, and writes `priority_score` +
 * `priority_breakdown` back. This is the bridge between the pure engine and
 * the Supabase layer.
 *
 * Owner: C (engine). The cron route that calls this lives in `app/api/cron/`
 * (B's territory), but the scoring logic and DB orchestration are engine work.
 *
 * PRD §7 rules enforced here:
 * - Never on page load — runs as Vercel Cron every 5 min
 * - Manual override sticks — skip incidents with manual_override = true
 * - N_users from incident_reporters, not raw report count
 * - Writes both priority_score and the full breakdown for the admin panel
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { computePriority, type PriorityScoringOptions } from './priority';
import type { Category } from './types';

// ─── Row types for the queries ──────────────────────────────────────────────

/** Shape of an incident row as read for rescoring. */
interface RescoreRow {
  id: string;
  category: Category;
  report_count: number;
  first_reported_at: string;
  manual_override: boolean;
  previous_incident_id: string | null;
}

/** Result of a rescore run. */
export interface RescoreResult {
  /** Total open incidents examined */
  readonly examined: number;
  /** Incidents actually scored (excludes manual overrides) */
  readonly scored: number;
  /** Incidents skipped due to manual_override = true */
  readonly skipped: number;
  /** Errors encountered during individual updates */
  readonly errors: number;
  /** Wall-clock time in milliseconds */
  readonly durationMs: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/**
 * Open statuses — incidents in these states get rescored.
 * Matches the partial index predicate in 0001_init.sql.
 */
const OPEN_STATUSES = ['SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'];

/** Page size for reading incidents. Keeps each RPC call bounded. */
const PAGE_SIZE = 500;

// ─── Core Rescore Function ──────────────────────────────────────────────────

/**
 * Rescore all open incidents in the database.
 *
 * Reads incidents in pages, computes priority for each using the pure engine,
 * and writes back `priority_score` and `priority_breakdown`. Skips incidents
 * with `manual_override = true`.
 *
 * @param db - Service-role Supabase client (bypasses RLS)
 * @param options - Optional custom weights or severity map
 * @returns Summary of the rescore run
 */
export async function rescoreAllIncidents(
  db: SupabaseClient,
  options: PriorityScoringOptions = {},
): Promise<RescoreResult> {
  const start = Date.now();
  let examined = 0;
  let scored = 0;
  let skipped = 0;
  let errors = 0;
  let offset = 0;

  // Paginate through all open incidents
  while (true) {
    const { data: rows, error: fetchErr } = await db
      .from('incidents')
      .select('id, category, report_count, first_reported_at, manual_override, previous_incident_id')
      .in('status', OPEN_STATUSES)
      .range(offset, offset + PAGE_SIZE - 1)
      .returns<RescoreRow[]>();

    if (fetchErr) {
      console.error('[rescore] fetch failed:', fetchErr);
      throw new Error(`Failed to read incidents: ${fetchErr.message}`);
    }

    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      examined++;

      // PRD §7: manual override sticks
      if (row.manual_override) {
        skipped++;
        continue;
      }

      const daysOpen = Math.max(0, (Date.now() - Date.parse(row.first_reported_at)) / DAY_MS);

      const breakdown = computePriority(
        {
          category: row.category,
          uniqueUserCount: row.report_count,
          daysOpen: Math.round(daysOpen * 10) / 10,
          previousIncidentId: row.previous_incident_id,
        },
        options,
      );

      const { error: updateErr } = await db
        .from('incidents')
        .update({
          priority_score: breakdown.score,
          priority_breakdown: breakdown,
        })
        .eq('id', row.id);

      if (updateErr) {
        console.error(`[rescore] update failed for ${row.id}:`, updateErr);
        errors++;
      } else {
        scored++;
      }
    }

    // If we got fewer rows than PAGE_SIZE, we've reached the end
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return {
    examined,
    scored,
    skipped,
    errors,
    durationMs: Date.now() - start,
  };
}
