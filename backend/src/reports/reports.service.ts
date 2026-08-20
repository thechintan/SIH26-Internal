import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Report, ReportDocument } from '../schemas/report.schema';
import { Department, DepartmentDocument } from '../schemas/department.schema';
import { RoutingEngineService } from '../routing-engine/routing-engine.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import {
  ReportStatus,
  VALID_STATUS_TRANSITIONS,
  PriorityTier,
  UserRole,
} from '../common/constants';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
    private routingEngine: RoutingEngineService,
    private notifications: NotificationsService,
  ) {}

  // ── Create Report ─────────────────────────────────────────────────

  async create(dto: CreateReportDto, reporterId: string) {
    const { lng, lat } = dto.location;

    // 1. Duplicate detection: nearby open reports, same category, last 14 days
    const duplicates = await this.findDuplicates(lng, lat, dto.category);

    // 2. Run routing engine
    const routing = await this.routingEngine.routeReport(
      lng, lat, dto.category, dto.description || '', 0,
    );

    // 3. Create report
    const report = await this.reportModel.create({
      reporter_id: new Types.ObjectId(reporterId),
      category: dto.category,
      description: dto.description,
      voice_note_url: dto.voice_note_url,
      images: dto.images,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      address: dto.address,
      ward_id: routing.ward_id,
      status: ReportStatus.ACKNOWLEDGED,
      priority_tier: routing.priority_tier,
      priority_score: routing.priority_score,
      assigned_department_id: routing.department_id,
      status_history: [
        {
          status: ReportStatus.SUBMITTED,
          note: 'Report submitted by citizen',
          actor_id: new Types.ObjectId(reporterId),
          timestamp: new Date(),
        },
        {
          status: ReportStatus.ACKNOWLEDGED,
          note: 'Auto-acknowledged by routing engine',
          actor_id: new Types.ObjectId(reporterId),
          timestamp: new Date(),
        },
      ],
    });

    // 4. Notify citizen
    this.notifications.send(
      reporterId,
      'Report Acknowledged',
      `Your report #${report._id.toString().slice(-6).toUpperCase()} has been acknowledged and routed.`,
      { reportId: report._id.toString() },
    );

    // 5. If critical, notify department head
    if (routing.priority_tier === PriorityTier.CRITICAL) {
      const dept = await this.departmentModel.findById(routing.department_id).lean();
      if (dept?.head_user_id) {
        this.notifications.send(
          dept.head_user_id.toString(),
          '🚨 Critical Report',
          `A critical-priority ${dto.category} report has been routed to your department.`,
          { reportId: report._id.toString() },
        );
      }
    }

    return {
      report,
      potential_duplicates: duplicates.map((d: any) => ({
        id: d._id,
        category: d.category,
        status: d.status,
        distance_meters: d.distance,
        created_at: d.createdAt,
      })),
    };
  }

  // ── Find Duplicates ───────────────────────────────────────────────

  private async findDuplicates(lng: number, lat: number, category: string) {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    return this.reportModel.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance',
          maxDistance: 50, // 50 meters
          query: {
            category,
            status: { $nin: [ReportStatus.VERIFIED, ReportStatus.RESOLVED] },
            createdAt: { $gte: fourteenDaysAgo },
          },
          spherical: true,
        },
      },
      { $limit: 5 },
      {
        $project: {
          _id: 1, category: 1, status: 1, distance: 1, createdAt: 1,
        },
      },
    ]);
  }

  // ── Get Reports (role-scoped) ─────────────────────────────────────

  async findAll(query: QueryReportsDto, user: any) {
    const filter: any = {};
    const page = parseInt(query.page || '1', 10);
    const limit = Math.min(parseInt(query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;
    const sort = query.sort || '-createdAt';

    // Role-based scoping
    switch (user.role) {
      case UserRole.CITIZEN:
        filter.reporter_id = new Types.ObjectId(user.userId);
        break;
      case UserRole.STAFF:
        filter.assigned_staff_id = new Types.ObjectId(user.userId);
        break;
      case UserRole.DEPT_HEAD:
        if (user.department_id) {
          filter.assigned_department_id = new Types.ObjectId(user.department_id);
        }
        break;
      case UserRole.SUPER_ADMIN:
        // No filter — sees everything
        break;
    }

    // Apply query filters
    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;
    if (query.priority_tier) filter.priority_tier = query.priority_tier;
    if (query.ward_id) filter.ward_id = new Types.ObjectId(query.ward_id);
    if (query.department_id)
      filter.assigned_department_id = new Types.ObjectId(query.department_id);
    if (query.from_date || query.to_date) {
      filter.createdAt = {};
      if (query.from_date) filter.createdAt.$gte = new Date(query.from_date);
      if (query.to_date) filter.createdAt.$lte = new Date(query.to_date);
    }

    const [reports, total] = await Promise.all([
      this.reportModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('assigned_department_id', 'name')
        .populate('ward_id', 'name')
        .populate('reporter_id', 'name phone')
        .lean(),
      this.reportModel.countDocuments(filter),
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get Single Report ─────────────────────────────────────────────

  async findById(id: string) {
    const report = await this.reportModel
      .findById(id)
      .populate('assigned_department_id', 'name')
      .populate('assigned_staff_id', 'name email')
      .populate('ward_id', 'name')
      .populate('reporter_id', 'name phone')
      .lean();

    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  // ── Update Status ─────────────────────────────────────────────────

  async updateStatus(reportId: string, dto: UpdateStatusDto, user: any) {
    const report = await this.reportModel.findById(reportId);
    if (!report) throw new NotFoundException('Report not found');

    const currentStatus = report.status;
    const newStatus = dto.status;

    // Validate state machine transition
    const validNext = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!validNext || !validNext.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
          `Valid transitions: ${validNext?.join(', ') || 'none'}`,
      );
    }

    // Citizen can only verify or reopen their own resolved reports
    if (
      (newStatus === ReportStatus.VERIFIED || newStatus === ReportStatus.REOPENED) 
    ) {
      if (user.role === UserRole.CITIZEN) {
        if (report.reporter_id.toString() !== user.userId) {
          throw new ForbiddenException('You can only verify/reopen your own reports');
        }
        // Check 48-hour window
        const resolvedEntry = [...report.status_history]
          .reverse()
          .find((h) => h.status === ReportStatus.RESOLVED);
        if (resolvedEntry) {
          const hoursSinceResolved =
            (Date.now() - new Date(resolvedEntry.timestamp).getTime()) / (1000 * 60 * 60);
          if (hoursSinceResolved > 48) {
            throw new BadRequestException(
              'The 48-hour window for verification/reopening has expired',
            );
          }
        }
      }
    }

    // Resolution requires an after-photo
    if (newStatus === ReportStatus.RESOLVED && !dto.photo_url) {
      throw new BadRequestException(
        'An after-photo URL is required when resolving a report',
      );
    }

    // Apply transition
    report.status = newStatus;
    report.status_history.push({
      status: newStatus,
      note: dto.note,
      actor_id: new Types.ObjectId(user.userId),
      timestamp: new Date(),
      photo_url: dto.photo_url,
    } as any);

    if (newStatus === ReportStatus.RESOLVED) {
      report.resolved_at = new Date();
    }

    await report.save();

    // Notify the citizen
    const statusLabels: Record<string, string> = {
      in_progress: 'In Progress',
      resolved: 'Resolved',
      verified: 'Verified',
      reopened: 'Reopened',
      acknowledged: 'Acknowledged',
    };

    this.notifications.send(
      report.reporter_id.toString(),
      `Report ${statusLabels[newStatus] || newStatus}`,
      `Your report #${report._id.toString().slice(-6).toUpperCase()} status: ${statusLabels[newStatus] || newStatus}. ${dto.note}`,
      { reportId: report._id.toString(), status: newStatus },
    );

    return report;
  }

  // ── Upvote ────────────────────────────────────────────────────────

  async upvote(reportId: string, userId: string) {
    const report = await this.reportModel.findById(reportId);
    if (!report) throw new NotFoundException('Report not found');

    const userObjId = new Types.ObjectId(userId);
    const alreadyUpvoted = report.upvoted_by.some(
      (id) => id.toString() === userId,
    );

    if (alreadyUpvoted) {
      return { message: 'Already upvoted', upvote_count: report.upvote_count };
    }

    report.upvoted_by.push(userObjId);
    report.upvote_count += 1;

    // Recalculate priority with new upvote count
    const [lng, lat] = report.location.coordinates;
    const { score, tier } = await this.routingEngine.computePriority(
      lng, lat, report.category, report.description || '', report.upvote_count,
    );
    report.priority_score = score;
    report.priority_tier = tier;

    await report.save();

    // Notify department head if priority escalated to critical
    if (tier === PriorityTier.CRITICAL) {
      const dept = await this.departmentModel
        .findById(report.assigned_department_id)
        .lean();
      if (dept?.head_user_id) {
        this.notifications.send(
          dept.head_user_id.toString(),
          '🚨 Priority Escalated to Critical',
          `Report #${report._id.toString().slice(-6).toUpperCase()} has been escalated to critical priority via upvotes.`,
          { reportId: report._id.toString() },
        );
      }
    }

    return { message: 'Upvoted', upvote_count: report.upvote_count };
  }

  // ── Map Reports (lightweight) ─────────────────────────────────────

  async getMapReports(query: {
    sw_lng?: number;
    sw_lat?: number;
    ne_lng?: number;
    ne_lat?: number;
    category?: string;
    status?: string;
  }) {
    const filter: any = {};

    // Bounding box filter
    if (query.sw_lng && query.sw_lat && query.ne_lng && query.ne_lat) {
      filter.location = {
        $geoWithin: {
          $box: [
            [query.sw_lng, query.sw_lat],
            [query.ne_lng, query.ne_lat],
          ],
        },
      };
    }

    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;

    return this.reportModel
      .find(filter)
      .select('_id location category status priority_tier upvote_count createdAt address')
      .limit(500)
      .lean();
  }

  // ── Reassign Report ───────────────────────────────────────────────

  async reassign(
    reportId: string,
    departmentId: string,
    staffId: string | null,
    userId: string,
  ) {
    const report = await this.reportModel.findById(reportId);
    if (!report) throw new NotFoundException('Report not found');

    report.assigned_department_id = new Types.ObjectId(departmentId);
    if (staffId) {
      report.assigned_staff_id = new Types.ObjectId(staffId);
    }

    report.status_history.push({
      status: report.status,
      note: `Reassigned to department ${departmentId}${staffId ? ` / staff ${staffId}` : ''}`,
      actor_id: new Types.ObjectId(userId),
      timestamp: new Date(),
    } as any);

    await report.save();
    return report;
  }
}
