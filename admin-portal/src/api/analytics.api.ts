import { apiClient } from './client';
import { AnalyticsSummary } from '../types/analytics';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const analyticsApi = {
  getSummary: async (): Promise<AnalyticsSummary> => {
    return apiClient.get('/analytics/summary');
  },

  downloadCsv: async (): Promise<void> => {
    const token = localStorage.getItem('civicpulse_access_token');
    const response = await fetch(`${API_BASE_URL}/analytics/export`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export CSV');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `civicpulse-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
