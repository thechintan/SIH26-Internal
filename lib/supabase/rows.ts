/**
 * Row shapes for the tables in supabase/migrations/.
 *
 * Owner: B (backend).
 *
 * Hand-written rather than generated. `supabase gen types typescript` would be
 * the better answer and is worth doing once the CLI is linked — but a generated
 * file that nobody can regenerate mid-hackathon is worse than a small honest one,
 * and these are only the columns the API actually selects.
 *
 * If you add a column to a migration and select it, add it here. The compiler
 * will not catch a missing one: PostgREST hands back whatever it is asked for.
 */
import type {
  Category,
  Department,
  Role,
  SeveritySelf,
  Status,
} from '../contracts/enums';
import type { PriorityBreakdown } from '../contracts/incident';

export type UserRow = {
  id: string;
  role: Role;
  full_name: string | null;
  department: Department | null;
};

export type WardRef = { name: string } | null;

export type IncidentRow = {
  id: string;
  category: Category;
  address: string | null;
  ward_id: string | null;
  report_count: number;
  status: Status;
  department: Department | null;
  priority_score: number;
  manual_override: boolean;
  flagged_mismatch: boolean;
  first_reported_at: string;
  previous_incident_id: string | null;
  centroid_lat: number;
  centroid_lng: number;
  /** Embedded via the PostgREST relationship, singular. */
  wards: WardRef;
};

export type IncidentDetailRow = IncidentRow & {
  priority_breakdown: PriorityBreakdown | null;
  assigned_to: string | null;
  sla_due_at: string | null;
  resolved_at: string | null;
  resolution_photo_url: string | null;
};

export type ReportRow = {
  id: string;
  ticket_id: string;
  category: Category;
  photo_url: string;
  address: string | null;
  description: string | null;
  severity_self: SeveritySelf;
  voice_note_url: string | null;
  gps_accuracy_m: number;
  lat: number;
  lng: number;
  created_at: string;
};

/** What an incident's contributing reports look like on the detail screen. */
export type IncidentReportRow = ReportRow;

/**
 * A report joined to its incident. PostgREST returns the embedded relationship
 * as an object for a many-to-one, but types it as an array in some versions —
 * `embeddedOne` below normalises that so callers never branch on it.
 */
export type ReportWithIncidentRow = ReportRow & {
  incident_id: string;
  incidents: {
    status: Status;
    report_count: number;
    department: Department | null;
    resolution_photo_url: string | null;
  } | null;
};

export type StatusHistoryRow = {
  from_status: Status | null;
  to_status: Status;
  at: string;
  note: string | null;
  users: { full_name: string | null } | null;
};

export type VerificationRow = { fixed: boolean };

export type RecurrenceRow = {
  id: string;
  first_reported_at: string;
  resolved_at: string | null;
  previous_incident_id: string | null;
};

/**
 * Normalises a PostgREST embedded relationship that may arrive as an object or
 * as a one-element array. Cheaper than discovering the difference at demo time.
 */
export function embeddedOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
