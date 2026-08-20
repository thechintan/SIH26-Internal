export interface CategoryBreakdown {
  category: string;
  count: number;
  avgResolutionHours: number;
}

export interface DepartmentBreakdown {
  department: string;
  count: number;
  avgResolutionHours: number;
}

export interface WardBreakdown {
  ward: string;
  count: number;
  avgResolutionHours: number;
}

export interface VolumeTrendEntry {
  date: string;
  count: number;
}

export interface AnalyticsSummary {
  avgAcknowledgmentTimeHours: number;
  avgResolutionTimeHours: number;
  byCategory: CategoryBreakdown[];
  byDepartment: DepartmentBreakdown[];
  byWard: WardBreakdown[];
  volumeTrend: VolumeTrendEntry[];
  slaCompliancePercent: number;
  totalCounts: Record<string, number>;
  slaTargetHours: number;
}
