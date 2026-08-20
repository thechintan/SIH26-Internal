import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SystemConfig,
  SystemConfigDocument,
} from '../schemas/system-config.schema';
import {
  RoutingRule,
  RoutingRuleDocument,
} from '../schemas/routing-rule.schema';
import {
  Department,
  DepartmentDocument,
} from '../schemas/department.schema';

@Injectable()
export class AdminConfigService {
  constructor(
    @InjectModel(SystemConfig.name)
    private configModel: Model<SystemConfigDocument>,
    @InjectModel(RoutingRule.name)
    private routingRuleModel: Model<RoutingRuleDocument>,
    @InjectModel(Department.name)
    private departmentModel: Model<DepartmentDocument>,
  ) {}

  // ── System Config (singleton) ─────────────────────────────────────

  private async getOrCreateConfig(): Promise<SystemConfigDocument> {
    let config = await this.configModel.findOne();
    if (!config) {
      config = await this.configModel.create({});
    }
    return config;
  }

  // ── Categories ────────────────────────────────────────────────────

  async getCategories(): Promise<string[]> {
    const config = await this.getOrCreateConfig();
    return config.categories;
  }

  async updateCategories(categories: string[]): Promise<string[]> {
    const config = await this.getOrCreateConfig();
    config.categories = categories;
    await config.save();
    return config.categories;
  }

  // ── Priority Weights ──────────────────────────────────────────────

  async getPriorityWeights() {
    const config = await this.getOrCreateConfig();
    return {
      priority_weights: config.priority_weights,
      category_base_weights: config.category_base_weights,
    };
  }

  async updatePriorityWeights(
    weights: { w1?: number; w2?: number; w3?: number; w4?: number },
    categoryBaseWeights?: Record<string, number>,
  ) {
    const config = await this.getOrCreateConfig();
    if (weights) {
      config.priority_weights = { ...config.priority_weights, ...weights };
    }
    if (categoryBaseWeights) {
      config.category_base_weights = {
        ...config.category_base_weights,
        ...categoryBaseWeights,
      };
    }
    await config.save();
    return {
      priority_weights: config.priority_weights,
      category_base_weights: config.category_base_weights,
    };
  }

  // ── Routing Rules ─────────────────────────────────────────────────

  async getRoutingRules() {
    return this.routingRuleModel
      .find()
      .populate('department_id', 'name')
      .populate('ward_id', 'name')
      .lean();
  }

  async upsertRoutingRule(
    category: string,
    wardId: string | null,
    departmentId: string,
  ) {
    return this.routingRuleModel.findOneAndUpdate(
      {
        category,
        ward_id: wardId ? new Types.ObjectId(wardId) : null,
      },
      {
        category,
        ward_id: wardId ? new Types.ObjectId(wardId) : null,
        department_id: new Types.ObjectId(departmentId),
      },
      { upsert: true, new: true },
    );
  }

  async deleteRoutingRule(id: string) {
    const result = await this.routingRuleModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Routing rule not found');
    return { message: 'Routing rule deleted' };
  }

  // ── Departments ───────────────────────────────────────────────────

  async getDepartments() {
    return this.departmentModel.find().populate('head_user_id', 'name email').lean();
  }

  async createDepartment(data: {
    name: string;
    category_scope?: string[];
    head_user_id?: string;
  }) {
    return this.departmentModel.create({
      ...data,
      head_user_id: data.head_user_id
        ? new Types.ObjectId(data.head_user_id)
        : undefined,
    });
  }

  async updateDepartment(
    id: string,
    data: { name?: string; category_scope?: string[]; head_user_id?: string },
  ) {
    const dept = await this.departmentModel.findByIdAndUpdate(
      id,
      {
        ...data,
        ...(data.head_user_id && {
          head_user_id: new Types.ObjectId(data.head_user_id),
        }),
      },
      { new: true },
    );
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }
}
