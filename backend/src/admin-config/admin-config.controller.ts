import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminConfigService } from './admin-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/constants';

@ApiTags('Admin Configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminConfigController {
  constructor(private readonly configService: AdminConfigService) {}

  // ── Categories ────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'Get all report categories' })
  async getCategories() {
    return this.configService.getCategories();
  }

  @Put('categories')
  @ApiOperation({ summary: 'Update category list' })
  async updateCategories(@Body() body: { categories: string[] }) {
    return this.configService.updateCategories(body.categories);
  }

  // ── Priority Weights ──────────────────────────────────────────────

  @Get('priority-weights')
  @ApiOperation({ summary: 'Get priority scoring weights' })
  async getPriorityWeights() {
    return this.configService.getPriorityWeights();
  }

  @Put('priority-weights')
  @ApiOperation({ summary: 'Update priority scoring weights' })
  async updatePriorityWeights(
    @Body()
    body: {
      priority_weights?: { w1?: number; w2?: number; w3?: number; w4?: number };
      category_base_weights?: Record<string, number>;
    },
  ) {
    return this.configService.updatePriorityWeights(
      body.priority_weights || {},
      body.category_base_weights,
    );
  }

  // ── Routing Rules ─────────────────────────────────────────────────

  @Get('routing-rules')
  @ApiOperation({ summary: 'List all routing rules' })
  async getRoutingRules() {
    return this.configService.getRoutingRules();
  }

  @Put('routing-rules')
  @ApiOperation({ summary: 'Upsert a routing rule (category + ward → department)' })
  async upsertRoutingRule(
    @Body()
    body: { category: string; ward_id?: string; department_id: string },
  ) {
    return this.configService.upsertRoutingRule(
      body.category,
      body.ward_id || null,
      body.department_id,
    );
  }

  @Delete('routing-rules/:id')
  @ApiOperation({ summary: 'Delete a routing rule' })
  async deleteRoutingRule(@Param('id') id: string) {
    return this.configService.deleteRoutingRule(id);
  }

  // ── Departments ───────────────────────────────────────────────────

  @Get('departments')
  @ApiOperation({ summary: 'List all departments' })
  async getDepartments() {
    return this.configService.getDepartments();
  }

  @Post('departments')
  @ApiOperation({ summary: 'Create a new department' })
  async createDepartment(
    @Body()
    body: { name: string; category_scope?: string[]; head_user_id?: string },
  ) {
    return this.configService.createDepartment(body);
  }

  @Patch('departments/:id')
  @ApiOperation({ summary: 'Update a department' })
  async updateDepartment(
    @Param('id') id: string,
    @Body()
    body: { name?: string; category_scope?: string[]; head_user_id?: string },
  ) {
    return this.configService.updateDepartment(id, body);
  }
}
