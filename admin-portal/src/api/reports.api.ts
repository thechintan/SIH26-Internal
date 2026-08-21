import { apiClient } from './client';
import {
  Report,
  ReportsResponse,
  MapReport,
  QueryReportsParams,
  ReportStatus,
} from '../types/report';

export const reportsApi = {
  getReports: async (params?: QueryReportsParams): Promise<ReportsResponse> => {
    // Filter out undefined or empty string values
    const cleanParams: Record<string, any> = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== 'all') {
          cleanParams[key] = value;
        }
      });
    }
    return apiClient.get('/reports', { params: cleanParams });
  },

  getReportById: async (id: string): Promise<Report> => {
    return apiClient.get(`/reports/${id}`);
  },

  updateStatus: async (
    id: string,
    data: { status: ReportStatus; note: string; photo_url?: string }
  ): Promise<Report> => {
    return apiClient.patch(`/reports/${id}/status`, data);
  },

  reassign: async (
    id: string,
    data: { department_id: string; staff_id?: string }
  ): Promise<Report> => {
    return apiClient.patch(`/reports/${id}/reassign`, data);
  },

  getMapReports: async (params?: {
    sw_lng?: number;
    sw_lat?: number;
    ne_lng?: number;
    ne_lat?: number;
    category?: string;
    status?: string;
  }): Promise<MapReport[]> => {
    const cleanParams: Record<string, any> = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== 'all') {
          cleanParams[key] = value;
        }
      });
    }
    return apiClient.get('/map/reports', { params: cleanParams });
  },

  upvote: async (id: string): Promise<{ message: string; upvote_count: number }> => {
    return apiClient.post(`/reports/${id}/upvote`);
  },
};
