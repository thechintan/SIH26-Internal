import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/constants';

@ApiTags('Reports')
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CITIZEN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a new civic issue report (citizen only)' })
  async create(
    @Body() dto: CreateReportDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.reportsService.create(dto, userId);
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List reports (role-scoped with filters)' })
  async findAll(@Query() query: QueryReportsDto, @CurrentUser() user: any) {
    return this.reportsService.findAll(query, user);
  }

  @Get('reports/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get report detail with full status history' })
  async findOne(@Param('id') id: string) {
    return this.reportsService.findById(id);
  }

  @Patch('reports/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update report status (enforces state machine)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.updateStatus(id, dto, user);
  }

  @Post('reports/:id/upvote')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CITIZEN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upvote / confirm an existing report (citizen only)' })
  async upvote(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.reportsService.upvote(id, userId);
  }

  @Patch('reports/:id/reassign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.DEPT_HEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reassign report to different department/staff' })
  async reassign(
    @Param('id') id: string,
    @Body() body: { department_id: string; staff_id?: string },
    @CurrentUser('userId') userId: string,
  ) {
    return this.reportsService.reassign(id, body.department_id, body.staff_id || null, userId);
  }

  @Get('map/reports')
  @ApiOperation({ summary: 'Get reports for map display (public, lightweight)' })
  @ApiQuery({ name: 'sw_lng', required: false })
  @ApiQuery({ name: 'sw_lat', required: false })
  @ApiQuery({ name: 'ne_lng', required: false })
  @ApiQuery({ name: 'ne_lat', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getMapReports(
    @Query('sw_lng') sw_lng?: string,
    @Query('sw_lat') sw_lat?: string,
    @Query('ne_lng') ne_lng?: string,
    @Query('ne_lat') ne_lat?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.reportsService.getMapReports({
      sw_lng: sw_lng ? parseFloat(sw_lng) : undefined,
      sw_lat: sw_lat ? parseFloat(sw_lat) : undefined,
      ne_lng: ne_lng ? parseFloat(ne_lng) : undefined,
      ne_lat: ne_lat ? parseFloat(ne_lat) : undefined,
      category,
      status,
    });
  }
}
