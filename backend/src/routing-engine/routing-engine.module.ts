import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoutingEngineService } from './routing-engine.service';
import { Ward, WardSchema } from '../schemas/ward.schema';
import { RoutingRule, RoutingRuleSchema } from '../schemas/routing-rule.schema';
import { Report, ReportSchema } from '../schemas/report.schema';
import { SystemConfig, SystemConfigSchema } from '../schemas/system-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ward.name, schema: WardSchema },
      { name: RoutingRule.name, schema: RoutingRuleSchema },
      { name: Report.name, schema: ReportSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
    ]),
  ],
  providers: [RoutingEngineService],
  exports: [RoutingEngineService],
})
export class RoutingEngineModule {}
