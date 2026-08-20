import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ward, WardDocument } from '../schemas/ward.schema';
import { RoutingRule, RoutingRuleDocument } from '../schemas/routing-rule.schema';
import { Report, ReportDocument } from '../schemas/report.schema';
import { SystemConfig, SystemConfigDocument } from '../schemas/system-config.schema';
import {
  PriorityTier,
  PRIORITY_THRESHOLDS,
  DEFAULT_CATEGORY_BASE_WEIGHTS,
} from '../common/constants';

/** Urgency keywords and their scores for priority computation */
const URGENCY_KEYWORDS: Record<string, number> = {
  emergency: 10,
  dangerous: 9,
  hazard: 9,
  hazardous: 9,
  flooding: 8,
  flooded: 8,
  collapse: 9,
  collapsed: 9,
  sinkhole: 9,
  electrocution: 10,
  fire: 10,
  accident: 8,
  injury: 9,
  injured: 9,
  urgent: 7,
  critical: 8,
  severe: 7,
  blocked: 6,
  overflowing: 6,
  broken: 5,
  leaking: 5,
  fallen: 6,
  unsafe: 7,
  risk: 6,
};

export interface RoutingResult {
  ward_id: Types.ObjectId | null;
  department_id: Types.ObjectId;
  priority_score: number;
  priority_tier: PriorityTier;
}

@Injectable()
export class RoutingEngineService {
  private readonly logger = new Logger(RoutingEngineService.name);

  constructor(
    @InjectModel(Ward.name) private wardModel: Model<WardDocument>,
    @InjectModel(RoutingRule.name) private routingRuleModel: Model<RoutingRuleDocument>,
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(SystemConfig.name) private configModel: Model<SystemConfigDocument>,
  ) {}

  /**
   * Resolve which ward a GPS coordinate falls within.
   * Uses MongoDB $geoIntersects with the ward boundary polygons.
   */
  async resolveWard(lng: number, lat: number): Promise<WardDocument | null> {
    const ward = await this.wardModel.findOne({
      boundary: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        },
      },
    }).lean();

    if (!ward) {
      this.logger.warn(`No ward found for coordinates [${lng}, ${lat}]`);
    }

    return ward as any;
  }

  /**
   * Look up the department for a given (category, ward) combination
   * from the admin-configurable routing rules table.
   * Falls back to category-only rule if ward-specific rule doesn't exist.
   */
  async assignDepartment(
    category: string,
    wardId: Types.ObjectId | null,
  ): Promise<Types.ObjectId> {
    // Try ward-specific rule first
    if (wardId) {
      const rule = await this.routingRuleModel
        .findOne({ category, ward_id: wardId })
        .lean();
      if (rule) return rule.department_id;
    }

    // Fallback: category-only catch-all rule (ward_id = null)
    const catchAll = await this.routingRuleModel
      .findOne({ category, ward_id: null })
      .lean();
    if (catchAll) return catchAll.department_id;

    throw new NotFoundException(
      `No routing rule found for category "${category}"${wardId ? ` in ward ${wardId}` : ''}`,
    );
  }

  /**
   * Compute priority score using the formula:
   * score = w1*(nearbyReportCount7d) + w2*(upvotes) + w3*(urgencyKeywordScore) + w4*(categoryBaseWeight)
   */
  async computePriority(
    lng: number,
    lat: number,
    category: string,
    description: string = '',
    upvotes: number = 0,
  ): Promise<{ score: number; tier: PriorityTier }> {
    // Load config (weights + category base weights)
    const config = await this.configModel.findOne().lean();
    const weights = config?.priority_weights || { w1: 3, w2: 2, w3: 5, w4: 1 };
    const categoryBaseWeights = config?.category_base_weights || DEFAULT_CATEGORY_BASE_WEIGHTS;

    // Factor 1: nearby open reports in last 7 days within 200m
    const nearbyCount = await this.countNearbyReports(lng, lat, 200, 7);

    // Factor 2: upvotes (passed in)
    // Factor 3: urgency keyword score from description
    const urgencyScore = this.computeUrgencyKeywordScore(description);

    // Factor 4: category base weight
    const categoryWeight = categoryBaseWeights[category] || 2;

    const score =
      weights.w1 * nearbyCount +
      weights.w2 * upvotes +
      weights.w3 * urgencyScore +
      weights.w4 * categoryWeight;

    const tier = this.scoreToPriorityTier(score);

    this.logger.debug(
      `Priority: nearby=${nearbyCount}, upvotes=${upvotes}, urgency=${urgencyScore}, ` +
        `catWeight=${categoryWeight} → score=${score} (${tier})`,
    );

    return { score, tier };
  }

  /**
   * Count open reports within a given radius (meters) from the past N days.
   */
  async countNearbyReports(
    lng: number,
    lat: number,
    radiusMeters: number,
    days: number,
  ): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.reportModel.countDocuments({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusMeters,
        },
      },
      status: { $nin: ['verified', 'resolved'] },
      createdAt: { $gte: since },
    });
  }

  /**
   * Scan description text for urgency keywords and return a score 0-10.
   */
  computeUrgencyKeywordScore(description: string): number {
    if (!description) return 0;

    const lower = description.toLowerCase();
    let maxScore = 0;

    for (const [keyword, score] of Object.entries(URGENCY_KEYWORDS)) {
      if (lower.includes(keyword)) {
        maxScore = Math.max(maxScore, score);
      }
    }

    return maxScore;
  }

  /**
   * Convert a numeric priority score to a PriorityTier.
   */
  scoreToPriorityTier(score: number): PriorityTier {
    if (score >= PRIORITY_THRESHOLDS.CRITICAL) return PriorityTier.CRITICAL;
    if (score >= PRIORITY_THRESHOLDS.HIGH) return PriorityTier.HIGH;
    if (score >= PRIORITY_THRESHOLDS.MEDIUM) return PriorityTier.MEDIUM;
    return PriorityTier.LOW;
  }

  /**
   * Full routing pipeline: resolve ward → assign department → compute priority.
   */
  async routeReport(
    lng: number,
    lat: number,
    category: string,
    description: string = '',
    upvotes: number = 0,
  ): Promise<RoutingResult> {
    const ward = await this.resolveWard(lng, lat);
    const wardId = ward ? (ward as any)._id : null;
    const departmentId = await this.assignDepartment(category, wardId);
    const { score, tier } = await this.computePriority(
      lng, lat, category, description, upvotes,
    );

    return {
      ward_id: wardId,
      department_id: departmentId,
      priority_score: score,
      priority_tier: tier,
    };
  }
}
