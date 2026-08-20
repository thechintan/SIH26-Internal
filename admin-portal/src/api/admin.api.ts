import { apiClient } from './client';
import { Department, RoutingRule, PriorityWeights, StaffUser } from '../types/admin';

export const adminApi = {
  // Categories
  getCategories: async (): Promise<string[]> => {
    return apiClient.get('/admin/categories');
  },

  updateCategories: async (categories: string[]): Promise<string[]> => {
    return apiClient.put('/admin/categories', { categories });
  },

  // Priority Weights
  getPriorityWeights: async (): Promise<PriorityWeights> => {
    return apiClient.get('/admin/priority-weights');
  },

  updatePriorityWeights: async (data: {
    priority_weights?: { w1?: number; w2?: number; w3?: number; w4?: number };
    category_base_weights?: Record<string, number>;
  }): Promise<PriorityWeights> => {
    return apiClient.put('/admin/priority-weights', data);
  },

  // Routing Rules
  getRoutingRules: async (): Promise<RoutingRule[]> => {
    return apiClient.get('/admin/routing-rules');
  },

  upsertRoutingRule: async (data: {
    category: string;
    ward_id?: string | null;
    department_id: string;
  }): Promise<RoutingRule> => {
    return apiClient.put('/admin/routing-rules', data);
  },

  deleteRoutingRule: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete(`/admin/routing-rules/${id}`);
  },

  // Departments
  getDepartments: async (): Promise<Department[]> => {
    return apiClient.get('/admin/departments');
  },

  createDepartment: async (data: {
    name: string;
    category_scope?: string[];
    head_user_id?: string;
  }): Promise<Department> => {
    return apiClient.post('/admin/departments', data);
  },

  updateDepartment: async (
    id: string,
    data: {
      name?: string;
      category_scope?: string[];
      head_user_id?: string;
    }
  ): Promise<Department> => {
    return apiClient.patch(`/admin/departments/${id}`, data);
  },

  // Staff / Users
  listStaff: async (): Promise<StaffUser[]> => {
    return apiClient.get('/admin/users');
  },

  createStaff: async (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    department_id?: string;
    ward_scope?: string[];
  }): Promise<StaffUser> => {
    return apiClient.post('/admin/users', data);
  },
};
