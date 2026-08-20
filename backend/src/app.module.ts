import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ReportsModule } from './reports/reports.module';
import { RoutingEngineModule } from './routing-engine/routing-engine.module';
import { UploadsModule } from './uploads/uploads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminConfigModule } from './admin-config/admin-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI', 'mongodb://localhost:27017/civicpulse'),
      }),
    }),
    AuthModule,
    UsersModule,
    ReportsModule,
    RoutingEngineModule,
    UploadsModule,
    NotificationsModule,
    AnalyticsModule,
    AdminConfigModule,
  ],
})
export class AppModule {}
