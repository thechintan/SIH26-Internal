export enum ReportStatus {
  SUBMITTED = 'submitted',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  VERIFIED = 'verified',
  REOPENED = 'reopened',
}

/**
 * Valid state transitions for the report lifecycle.
 * Key: current status → Value: array of valid next statuses.
 * 
 * Flow: Submitted → Acknowledged → In Progress → Resolved → Verified/Reopened
 * Note: Submitted → Acknowledged is auto-triggered by routing engine.
 */
export const VALID_STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.SUBMITTED]: [ReportStatus.ACKNOWLEDGED],
  [ReportStatus.ACKNOWLEDGED]: [ReportStatus.IN_PROGRESS],
  [ReportStatus.IN_PROGRESS]: [ReportStatus.RESOLVED],
  [ReportStatus.RESOLVED]: [ReportStatus.VERIFIED, ReportStatus.REOPENED],
  [ReportStatus.VERIFIED]: [],
  [ReportStatus.REOPENED]: [ReportStatus.ACKNOWLEDGED, ReportStatus.IN_PROGRESS],
};
