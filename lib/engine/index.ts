/**
 * CivicReport — Engine Barrel Export
 *
 * Public API for the intelligence layer.
 * Import from '@/lib/engine' to access all engine functions.
 */

// Types
export type {
  Category,
  Status,
  Department,
  Severity,
  PriorityTier,
  PriorityWeights,
  PriorityBreakdown,
  GeoPoint,
  EngineReport,
  EngineIncident,
  ClusteringResult,
  MergeValidation,
  MergedIncidentData,
} from './types';

export {
  CategoryEnum,
  StatusEnum,
  DepartmentEnum,
  SeverityEnum,
  PriorityTierEnum,
  PRIORITY_THRESHOLDS,
  DEFAULT_WEIGHTS,
  OPEN_STATUSES,
  TERMINAL_STATUSES,
} from './types';

// Severity
export { getSeverity, DEFAULT_SEVERITY_MAP } from './severity';

// Priority
export type { PriorityScoringInput, PriorityScoringOptions } from './priority';
export { computePriority, computePriorityTier, computePriorityBatch } from './priority';

// Routing
export type { RoutingResult } from './routing';
export {
  routeToDepartment,
  getCategoriesForDepartment,
  CATEGORY_DEPARTMENT_MAP,
} from './routing';

// Clustering
export type { ClusterCandidate } from './clustering';
export {
  computeAdaptiveRadius,
  shouldCluster,
  recomputeCentroid,
  haversineDistanceM,
  makeClusteringDecision,
} from './clustering';

// Recurrence
export type { RecurrenceChain } from './recurrence';
export {
  isRecurring,
  getRecurrenceBonus,
  buildRecurrenceChain,
} from './recurrence';

// Merge
export { validateMerge, computeMerge } from './merge';
