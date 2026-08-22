/**
 * CivicReport — Severity Table
 *
 * Default category → severity score mapping from PRD §7 / ENUMS.md.
 * In production, this is read from the `category_severity` DB table
 * (editable by Super Admin in admin settings). This module provides
 * the seed defaults and a pure lookup function.
 *
 * PRD §7: "Severity as config, not code. Different municipalities
 * weight differently. Ship a default table, make it editable."
 */

import { type Category, CategoryEnum } from './types';

/**
 * Default severity scores (S_cat) from PRD §7 / ENUMS.md.
 * These are the seed row for the `category_severity` table.
 */
export const DEFAULT_SEVERITY_MAP: Readonly<Record<Category, number>> = {
  [CategoryEnum.STRUCTURAL]: 10,    // Bridge / structural damage
  [CategoryEnum.ELECTRICAL]: 9,     // Exposed electrical wiring
  [CategoryEnum.DRAIN_MANHOLE]: 9,  // Open manhole / drain collapse
  [CategoryEnum.WATER_LEAK]: 7,     // Water pipeline leak
  [CategoryEnum.POTHOLE]: 6,        // Large pothole
  [CategoryEnum.FOOTPATH]: 4,       // Damaged footpath
  [CategoryEnum.GARBAGE]: 3,        // Garbage overflow
  [CategoryEnum.STREETLIGHT]: 2,    // Streetlight not working
  [CategoryEnum.OTHER]: 2,          // Other — lowest default
} as const;

/**
 * Look up the severity score for a category.
 *
 * @param category - The category enum value
 * @param severityMap - Optional custom severity map (from DB). Falls back to defaults.
 * @returns The severity score (S_cat)
 */
export function getSeverity(
  category: Category,
  severityMap: Readonly<Record<Category, number>> = DEFAULT_SEVERITY_MAP,
): number {
  const score = severityMap[category];
  if (score === undefined) {
    // Defensive: if a category somehow isn't in the map, return the lowest
    return DEFAULT_SEVERITY_MAP[CategoryEnum.OTHER];
  }
  return score;
}
