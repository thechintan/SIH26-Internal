export type ReportStatus =
  | 'submitted'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'verified'
  | 'reopened';

export type PriorityTier = 'low' | 'medium' | 'high' | 'critical';

export type ReportCategory =
  | 'pothole'
  | 'streetlight'
  | 'garbage'
  | 'water_leakage'
  | 'drainage'
  | 'stray_animal'
  | 'other';

export const VALID_STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  submitted: ['acknowledged'],
  acknowledged: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['verified', 'reopened'],
  verified: [],
  reopened: ['acknowledged', 'in_progress'],
};

export interface StatusHistoryEntry {
  status: ReportStatus;
  note: string;
  actor_id?: { _id: string; name: string; email?: string } | string;
  timestamp: string;
  photo_url?: string;
}

export interface Report {
  _id: string;
  reporter_id?: {
    _id: string;
    name: string;
    phone?: string;
  };
  category: ReportCategory | string;
  description?: string;
  voice_note_url?: string;
  images?: string[];
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  address?: string;
  ward_id?: {
    _id: string;
    name: string;
  } | string;
  assigned_department_id?: {
    _id: string;
    name: string;
  } | string;
  assigned_staff_id?: {
    _id: string;
    name: string;
    email: string;
  } | string;
  status: ReportStatus;
  priority_tier: PriorityTier;
  priority_score: number;
  upvote_count: number;
  status_history: StatusHistoryEntry[];
  resolved_at?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReportsResponse {
  reports: Report[];
  pagination: ReportPagination;
}

export interface MapReport {
  _id: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  category: string;
  status: ReportStatus;
  priority_tier: PriorityTier;
  upvote_count: number;
  createdAt: string;
  address?: string;
}

export interface QueryReportsParams {
  category?: string;
  status?: string;
  priority_tier?: string;
  ward_id?: string;
  department_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number | string;
  limit?: number | string;
  sort?: string;
}
