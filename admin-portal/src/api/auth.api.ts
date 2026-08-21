import { apiClient } from './client';
import { AuthResponse, User } from '../types/auth';

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    return apiClient.post('/auth/staff/login', { email, password });
  },

  logout: async (): Promise<{ message: string }> => {
    return apiClient.post('/auth/logout');
  },

  getCurrentUser: async (): Promise<User> => {
    return apiClient.get('/users/me');
  },

  updateProfile: async (data: { name?: string; fcm_token?: string }): Promise<User> => {
    return apiClient.patch('/users/me', data);
  },
};
