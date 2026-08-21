import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh calls simultaneously
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('civicpulse_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle data unwrapping & 401 auto-refresh
apiClient.interceptors.response.use(
  (response) => {
    // If it's a blob/file response (CSV export), return the raw response
    if (response.config.responseType === 'blob') {
      return response;
    }
    // Unwrap the NestJS TransformInterceptor envelope { success, data, timestamp }
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data;
    }
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and request was not already a retry or refresh attempt
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/staff/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject: (err) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('civicpulse_refresh_token');

      if (!refreshToken) {
        // No refresh token -> force logout
        localStorage.removeItem('civicpulse_access_token');
        localStorage.removeItem('civicpulse_refresh_token');
        localStorage.removeItem('civicpulse_user');
        window.dispatchEvent(new Event('auth:logout'));
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const data = refreshResponse.data?.data || refreshResponse.data;
        const newAccessToken = data.accessToken;
        const newRefreshToken = data.refreshToken;

        localStorage.setItem('civicpulse_access_token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('civicpulse_refresh_token', newRefreshToken);
        }

        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('civicpulse_access_token');
        localStorage.removeItem('civicpulse_refresh_token');
        localStorage.removeItem('civicpulse_user');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Extract error message from backend
    const backendMessage =
      (error.response?.data as any)?.message ||
      (error.response?.data as any)?.error ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject(new Error(Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage));
  }
);
