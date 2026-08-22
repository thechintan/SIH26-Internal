/**
 * CivicReport — Priority Scoring Engine
 *
 * Implements the priority formula from PRD §7:
 *   P = w₁·S_cat + w₂·ln(1+N_users) + w₃·D_open + w₄·B_recur
 *
 * RULES (from PRD):
 * - Never compute on page load. This runs as a Vercel Cron job every 5 min.
 * - Manual override sticks: if manual_override = true, skip that incident.
 * - Unique users only: N_users comes from incident_reporters, not raw report rows.
 * - Returns a full PriorityBreakdown for the admin panel (PRD §10.4).
 *
 * This module contains only the pure computation. The cron endpoint that
 * reads from DB and writes priority_score + priority_breakdown is wired
 * by Person B in app/api/.
 */

import { getSeverity, DEFAULT_SEVERITY_MAP } from './severity';
import { getRecurrenceBonus } from './recurrence';
import {
  type Category,
  type PriorityBreakdown,
  type PriorityTier,
  type PriorityWeights,
  PriorityTierEnum,
  PRIORITY_THRESHOLDS,
  DEFAULT_WEIGHTS,
} from './types';

// ─── Core Inputs ────────────────────────────────────────────────────────────

export interface PriorityScoringInput {
  /** The incident's category */
  readonly category: Category;
  /** Number of unique users who reported this incident */
  readonly uniqueUserCount: number;
  /** Number of days since first_reported_at */
  readonly daysOpen: number;
  /** UUID of the previous incident at this location, or null */
  readonly previousIncidentId: string | null;
}

export interface PriorityScoringOptions {
  /** Custom weights (defaults to PRD starting weights) */
  readonly weights?: PriorityWeights;
  /** Custom severity map from DB (defaults to seed values) */
  readonly severityMap?: Readonly<Record<Category, number>>;
}

// ─── Priority Tier Mapping ──────────────────────────────────────────────────

/**
 * Map a numeric priority score to a tier (CRITICAL/HIGH/MEDIUM/LOW).
 * Thresholds from ENUMS.md, calibrated against the formula's real range.
 *
 *   CRITICAL: >= 20
 *   HIGH:     >= 14
 *   MEDIUM:   >= 8
 *   LOW:      < 8
 */
export function computePriorityTier(score: number): PriorityTier {
  if (score >= PRIORITY_THRESHOLDS.CRITICAL) return PriorityTierEnum.CRITICAL;
  if (score >= PRIORITY_THRESHOLDS.HIGH) return PriorityTierEnum.HIGH;
  if (score >= PRIORITY_THRESHOLDS.MEDIUM) return PriorityTierEnum.MEDIUM;
  return PriorityTierEnum.LOW;
}

// ─── Core Scoring Function ──────────────────────────────────────────────────

/**
 * Compute the priority score and full breakdown for an incident.
 *
 * Pure function — no side effects, no DB access. Takes plain values,
 * returns a PriorityBreakdown that the admin panel renders directly.
 *
 * PRD §7 formula:
 *   P = w₁·S_cat + w₂·ln(1+N_users) + w₃·D_open + w₄·B_recur
 *
 * PRD §7 shape justifications:
 *   - ln on report count: compresses viral issues so 1→10 matters, 100→500 barely does
 *   - Aging term: prevents queue starvation for low-severity categories
 *   - Recurrence bonus: flags infrastructure failures vs one-offs
 */
export function computePriority(
  input: PriorityScoringInput,
  options: PriorityScoringOptions = {},
): PriorityBreakdown {
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const severityMap = options.severityMap ?? DEFAULT_SEVERITY_MAP;

  // Factor 1: Category severity
  const baseSeverity = getSeverity(input.category, severityMap);
  const severityWeighted = weights.w1 * baseSeverity;

  // Factor 2: Report count (logarithmic compression)
  const logValue = Math.log(1 + input.uniqueUserCount);
  const reportCountWeighted = weights.w2 * logValue;

  // Factor 3: Days open (aging / anti-starvation)
  const ageWeighted = weights.w3 * input.daysOpen;

  // Factor 4: Recurrence bonus
  const bonus = getRecurrenceBonus(input.previousIncidentId);
  const recurrenceWeighted = weights.w4 * bonus;

  // Total score
  const score = severityWeighted + reportCountWeighted + ageWeighted + recurrenceWeighted;

  // Round to 2 decimal places for display consistency
  const roundedScore = Math.round(score * 100) / 100;

  return {
    score: roundedScore,
    tier: computePriorityTier(roundedScore),
    factors: {
      severity: {
        category: input.category,
        baseSeverity,
        weighted: Math.round(severityWeighted * 100) / 100,
      },
      reportCount: {
        uniqueUsers: input.uniqueUserCount,
        logValue: Math.round(logValue * 100) / 100,
        weighted: Math.round(reportCountWeighted * 100) / 100,
      },
      age: {
        daysOpen: input.daysOpen,
        weighted: Math.round(ageWeighted * 100) / 100,
      },
      recurrence: {
        isRecurring: bonus > 0,
        bonus,
        weighted: Math.round(recurrenceWeighted * 100) / 100,
      },
    },
    weights,
    computedAt: new Date().toISOString(),
  };
}

// ─── Batch Scoring ──────────────────────────────────────────────────────────

/**
 * Score multiple incidents in batch (for the cron job).
 * Skips incidents with manualOverride = true.
 */
export function computePriorityBatch(
  incidents: ReadonlyArray<PriorityScoringInput & { readonly id: string; readonly manualOverride: boolean }>,
  options: PriorityScoringOptions = {},
): Map<string, PriorityBreakdown> {
  const results = new Map<string, PriorityBreakdown>();

  for (const incident of incidents) {
    // PRD §7 edge case 1: manual override sticks
    if (incident.manualOverride) {
      continue;
    }

    results.set(incident.id, computePriority(incident, options));
  }

  return results;
}
