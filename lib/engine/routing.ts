/**
 * CivicReport — Routing Engine
 *
 * Layer 1 (MVP): deterministic category → department lookup.
 * PRD §8: "Reliable, debuggable, demoable."
 *
 * Layer 2 (stretch): LLM-assisted routing for ambiguous inputs.
 * "tree fell on power line" — Public Works or Electrical?
 * Always advisory; admin can reassign.
 *
 * The mapping comes from ENUMS.md's "Routes to" column.
 */

import {
  type Category,
  type Department,
  CategoryEnum,
  DepartmentEnum,
} from './types';

// ─── Category → Department Mapping ──────────────────────────────────────────
// From ENUMS.md "Routes to" column

/**
 * Deterministic routing table: category → department.
 *
 * `OTHER` maps to null — it goes to a triage queue for manual assignment.
 * This is deliberate: OTHER is a catch-all, and auto-routing it would
 * send ambiguous reports to the wrong department.
 */
export const CATEGORY_DEPARTMENT_MAP: Readonly<
  Record<Category, Department | null>
> = {
  [CategoryEnum.STRUCTURAL]: DepartmentEnum.PUBLIC_WORKS,
  [CategoryEnum.ELECTRICAL]: DepartmentEnum.ELECTRICAL,
  [CategoryEnum.DRAIN_MANHOLE]: DepartmentEnum.WATER_DRAINAGE,
  [CategoryEnum.WATER_LEAK]: DepartmentEnum.WATER_DRAINAGE,
  [CategoryEnum.POTHOLE]: DepartmentEnum.PUBLIC_WORKS,
  [CategoryEnum.FOOTPATH]: DepartmentEnum.PUBLIC_WORKS,
  [CategoryEnum.GARBAGE]: DepartmentEnum.SANITATION,
  [CategoryEnum.STREETLIGHT]: DepartmentEnum.ELECTRICAL,
  [CategoryEnum.OTHER]: null, // → triage queue, admin assigns manually
} as const;

// ─── Routing Function ───────────────────────────────────────────────────────

export interface RoutingResult {
  /** The assigned department, or null if manual triage needed */
  readonly department: Department | null;
  /** Whether this was auto-routed or needs manual assignment */
  readonly autoRouted: boolean;
  /** Human-readable reason for the routing decision */
  readonly reason: string;
}

/**
 * Route an incident to a department based on its category.
 *
 * Layer 1 (MVP): pure deterministic lookup. Every category maps to
 * exactly one department, except OTHER which goes to triage.
 *
 * @param category - The incident's category
 * @returns Routing result with department and explanation
 */
export function routeToDepartment(category: Category): RoutingResult {
  const department = CATEGORY_DEPARTMENT_MAP[category];

  if (department === null) {
    return {
      department: null,
      autoRouted: false,
      reason: `Category "${category}" requires manual triage — no default department mapping`,
    };
  }

  return {
    department,
    autoRouted: true,
    reason: `Category "${category}" auto-routed to ${department}`,
  };
}

/**
 * Get all categories that route to a specific department.
 * Useful for department-scoped views in the admin dashboard.
 *
 * @param department - The target department
 * @returns Array of categories that route to this department
 */
export function getCategoriesForDepartment(
  department: Department,
): Category[] {
  return (
    Object.entries(CATEGORY_DEPARTMENT_MAP) as [Category, Department | null][]
  )
    .filter(([, dept]) => dept === department)
    .map(([cat]) => cat);
}
