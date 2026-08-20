import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminConfigService } from './admin-config.service';
import { AdminConfigController } from './admin-config.controller';
import { SystemConfig, SystemConfigSchema } from '../schemas/system-config.schema';
import { RoutingRule, RoutingRuleSchema } from '../schemas/routing-rule.schema';
import { Department, DepartmentSchema } from '../schemas/department.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: RoutingRule.name, schema: RoutingRuleSchema },
      { name: Department.name, schema: DepartmentSchema },
    ]),
    AuthModule,
  ],
  controllers: [AdminConfigController],
  providers: [AdminConfigService],
})
export class AdminConfigModule {}
