export interface Department {
  _id: string;
  name: string;
  category_scope?: string[];
  head_user_id?: {
    _id: string;
    name: string;
    email: string;
  } | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoutingRule {
  _id: string;
  category: string;
  ward_id?: {
    _id: string;
    name: string;
  } | null;
  department_id: {
    _id: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PriorityWeights {
  priority_weights: {
    w1: number;
    w2: number;
    w3: number;
    w4: number;
  };
  category_base_weights: Record<string, number>;
}

export interface StaffUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  department_id?: {
    _id: string;
    name: string;
  } | string;
  ward_scope?: Array<{
    _id: string;
    name: string;
  } | string>;
  createdAt?: string;
}
