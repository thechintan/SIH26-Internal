/**
 * CivicReport — Recurrence Chain Detection
 *
 * Detects when an incident is a recurrence of a previously resolved
 * problem at the same location. PRD §6 rule: never cluster into a
 * RESOLVED incident — create a new one with previous_incident_id set.
 *
 * Locations with 3+ chained incidents are "recurring failure hotspots"
 * — worth surfacing in admin analytics (PRD §10.7, §12.5).
 *
 * PRD §7: recurrence bonus B_recur = 2 if previous_incident_id exists, 0 otherwise.
 */

// ─── Recurrence Bonus ───────────────────────────────────────────────────────

/** The fixed bonus value from PRD §7 for recurring incidents */
const RECURRENCE_BONUS = 2;

/**
 * Check if an incident is a recurrence of a previous one.
 *
 * @param previousIncidentId - The previous_incident_id field, or null
 * @returns true if this incident recurs at a location with prior history
 */
export function isRecurring(previousIncidentId: string | null): boolean {
  return previousIncidentId !== null;
}

/**
 * Get the recurrence bonus for the priority formula.
 *
 * PRD §7: B_recur = 2 if previous_incident_id exists, 0 otherwise.
 *
 * @param previousIncidentId - The previous_incident_id field, or null
 * @returns 2 if recurring, 0 if not
 */
export function getRecurrenceBonus(previousIncidentId: string | null): number {
  return isRecurring(previousIncidentId) ? RECURRENCE_BONUS : 0;
}

// ─── Chain Analysis ─────────────────────────────────────────────────────────

/**
 * Represents a chain of incidents at a location.
 * Chain length >= 3 means "recurring failure hotspot" (PRD §10.7).
 */
export interface RecurrenceChain {
  /** The most recent (current) incident ID */
  readonly currentId: string;
  /** Ordered list of incident IDs in the chain, oldest first */
  readonly chain: readonly string[];
  /** Total length of the chain */
  readonly length: number;
  /** Whether this qualifies as a "recurring failure hotspot" (3+) */
  readonly isHotspot: boolean;
}

/** Minimum chain length to qualify as a recurring-failure hotspot */
const HOTSPOT_THRESHOLD = 3;

/**
 * Build a recurrence chain from a list of linked incidents.
 *
 * In production, this walks the previous_incident_id links in the DB.
 * This pure function takes the pre-fetched chain of IDs.
 *
 * @param currentId - The current incident's ID
 * @param previousIds - Ordered list of previous incident IDs (oldest first),
 *                      following the previous_incident_id chain
 * @returns A RecurrenceChain analysis
 */
export function buildRecurrenceChain(
  currentId: string,
  previousIds: readonly string[],
): RecurrenceChain {
  const chain = [...previousIds, currentId];
  return {
    currentId,
    chain,
    length: chain.length,
    isHotspot: chain.length >= HOTSPOT_THRESHOLD,
  };
}
