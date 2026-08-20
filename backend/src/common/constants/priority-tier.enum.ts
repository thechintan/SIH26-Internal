export enum PriorityTier {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Priority tier thresholds.
 * Score >= CRITICAL_THRESHOLD → Critical
 * Score >= HIGH_THRESHOLD → High
 * Score >= MEDIUM_THRESHOLD → Medium
 * Score < MEDIUM_THRESHOLD → Low
 */
export const PRIORITY_THRESHOLDS = {
  CRITICAL: 40,
  HIGH: 25,
  MEDIUM: 12,
};
