import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Report, ReportDocument } from '../schemas/report.schema';
import { ReportStatus } from '../common/constants';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    private configService: ConfigService,
  ) {}

  async getSummary() {
    const slaTargetHours = parseInt(
      this.configService.get('SLA_TARGET_HOURS', '24'),
      10,
    );

    const [
      avgAcknowledgmentTime,
      avgResolutionTime,
      byCategory,
      byDepartment,
      byWard,
      volumeTrend,
      slaCompliance,
      totalCounts,
    ] = await Promise.all([
      this.getAvgAcknowledgmentTime(),
      this.getAvgResolutionTime(),
      this.getBreakdownByCategory(),
      this.getBreakdownByDepartment(),
      this.getBreakdownByWard(),
      this.getVolumeTrend(30),
      this.getSlaCompliance(slaTargetHours),
      this.getTotalCounts(),
    ]);

    return {
      avgAcknowledgmentTimeHours: avgAcknowledgmentTime,
      avgResolutionTimeHours: avgResolutionTime,
      byCategory,
      byDepartment,
      byWard,
      volumeTrend,
      slaCompliancePercent: slaCompliance,
      totalCounts,
      slaTargetHours,
    };
  }

  /** Average time from first status_history entry (submitted) to acknowledged */
  private async getAvgAcknowledgmentTime(): Promise<number> {
    const result = await this.reportModel.aggregate([
      {
        $match: {
          'status_history.1': { $exists: true }, // Has at least 2 history entries
        },
      },
      {
        $project: {
          submittedAt: { $arrayElemAt: ['$status_history.timestamp', 0] },
          acknowledgedAt: { $arrayElemAt: ['$status_history.timestamp', 1] },
        },
      },
      {
        $project: {
          diffMs: { $subtract: ['$acknowledgedAt', '$submittedAt'] },
        },
      },
      {
        $group: {
          _id: null,
          avgMs: { $avg: '$diffMs' },
        },
      },
    ]);

    return result.length > 0 ? +(result[0].avgMs / (1000 * 60 * 60)).toFixed(2) : 0;
  }

  /** Average time from created_at to resolved_at */
  private async getAvgResolutionTime(): Promise<number> {
    const result = await this.reportModel.aggregate([
      {
        $match: {
          resolved_at: { $exists: true, $ne: null },
        },
      },
      {
        $project: {
          diffMs: { $subtract: ['$resolved_at', '$createdAt'] },
        },
      },
      {
        $group: {
          _id: null,
          avgMs: { $avg: '$diffMs' },
        },
      },
    ]);

    return result.length > 0 ? +(result[0].avgMs / (1000 * 60 * 60)).toFixed(2) : 0;
  }

  /** Report count and avg resolution time grouped by category */
  private async getBreakdownByCategory() {
    return this.reportModel.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgResolutionMs: {
            $avg: {
              $cond: [
                { $ne: ['$resolved_at', null] },
                { $subtract: ['$resolved_at', '$createdAt'] },
                null,
              ],
            },
          },
        },
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          avgResolutionHours: {
            $round: [{ $divide: [{ $ifNull: ['$avgResolutionMs', 0] }, 3600000] }, 2],
          },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  /** Report count and avg resolution time grouped by department */
  private async getBreakdownByDepartment() {
    return this.reportModel.aggregate([
      {
        $group: {
          _id: '$assigned_department_id',
          count: { $sum: 1 },
          avgResolutionMs: {
            $avg: {
              $cond: [
                { $ne: ['$resolved_at', null] },
                { $subtract: ['$resolved_at', '$createdAt'] },
                null,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'dept',
        },
      },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          department: { $ifNull: ['$dept.name', 'Unassigned'] },
          count: 1,
          avgResolutionHours: {
            $round: [{ $divide: [{ $ifNull: ['$avgResolutionMs', 0] }, 3600000] }, 2],
          },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  /** Report count grouped by ward */
  private async getBreakdownByWard() {
    return this.reportModel.aggregate([
      {
        $group: {
          _id: '$ward_id',
          count: { $sum: 1 },
          avgResolutionMs: {
            $avg: {
              $cond: [
                { $ne: ['$resolved_at', null] },
                { $subtract: ['$resolved_at', '$createdAt'] },
                null,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'wards',
          localField: '_id',
          foreignField: '_id',
          as: 'ward',
        },
      },
      { $unwind: { path: '$ward', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          ward: { $ifNull: ['$ward.name', 'Unknown'] },
          count: 1,
          avgResolutionHours: {
            $round: [{ $divide: [{ $ifNull: ['$avgResolutionMs', 0] }, 3600000] }, 2],
          },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  /** Daily report volume for the last N days */
  private async getVolumeTrend(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.reportModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          date: '$_id',
          count: 1,
          _id: 0,
        },
      },
      { $sort: { date: 1 } },
    ]);
  }

  /** SLA compliance: % of resolved reports resolved within target hours */
  private async getSlaCompliance(targetHours: number): Promise<number> {
    const targetMs = targetHours * 60 * 60 * 1000;

    const result = await this.reportModel.aggregate([
      {
        $match: {
          resolved_at: { $exists: true, $ne: null },
        },
      },
      {
        $project: {
          diffMs: { $subtract: ['$resolved_at', '$createdAt'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          withinSla: {
            $sum: { $cond: [{ $lte: ['$diffMs', targetMs] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          percent: {
            $round: [
              { $multiply: [{ $divide: ['$withinSla', '$total'] }, 100] },
              1,
            ],
          },
        },
      },
    ]);

    return result.length > 0 ? result[0].percent : 100;
  }

  /** Total counts by status */
  private async getTotalCounts() {
    const result = await this.reportModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);

    const counts: Record<string, number> = { total: 0 };
    result.forEach((r: any) => {
      counts[r.status] = r.count;
      counts.total += r.count;
    });
    return counts;
  }

  /** Export reports as flat objects for CSV conversion */
  async getExportData(filters: any = {}) {
    return this.reportModel
      .find(filters)
      .populate('assigned_department_id', 'name')
      .populate('ward_id', 'name')
      .populate('reporter_id', 'name phone')
      .select('-status_history -upvoted_by -__v')
      .lean();
  }
}
