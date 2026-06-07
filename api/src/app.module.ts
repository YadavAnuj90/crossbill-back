import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { MongoModule } from './database/mongo.module';
import { RedisModule } from './common/redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ClientsModule } from './modules/clients/clients.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RemittancesModule } from './modules/remittances/remittances.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnv }),

    // Infrastructure — MongoDB (primary store), Redis (queue + cache).
    MongoModule,
    RedisModule,
    QueueModule,

    // Domain modules (design §15)
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ClientsModule,
    InvoicesModule,
    RemittancesModule,
    RemindersModule,
    ReportsModule,
    NotificationsModule,
    AuditModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule {}
