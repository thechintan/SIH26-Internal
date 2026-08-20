import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/constants';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.DEPT_HEAD)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get analytics summary (avg times, breakdowns, trends, SLA)',
  })
  async getSummary() {
    return this.analyticsService.getSummary();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export report data as CSV' })
  async exportCsv(@Res() res: Response) {
    const data = await this.analyticsService.getExportData();

    // Build CSV manually (lightweight, no heavy lib dependency)
    const headers = [
      'ID', 'Category', 'Status', 'Priority', 'Department',
      'Ward', 'Reporter', 'Address', 'Upvotes', 'Created', 'Resolved',
    ];

    const rows = data.map((r: any) => [
      r._id,
      r.category,
      r.status,
      r.priority_tier,
      r.assigned_department_id?.name || '',
      r.ward_id?.name || '',
      r.reporter_id?.name || '',
      (r.address || '').replace(/,/g, ';'),
      r.upvote_count || 0,
      r.createdAt ? new Date(r.createdAt).toISOString() : '',
      r.resolved_at ? new Date(r.resolved_at).toISOString() : '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="civicpulse-reports-${new Date().toISOString().slice(0, 10)}.csv"`,
    });

    res.send(csv);
  }
}
