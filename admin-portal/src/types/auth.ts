export type UserRole = 'citizen' | 'staff' | 'dept-head' | 'super-admin';

export interface User {
  _id: string;
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  department_id?: { _id: string; name: string } | string;
  ward_scope?: Array<{ _id: string; name: string } | string>;
  civic_score?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
