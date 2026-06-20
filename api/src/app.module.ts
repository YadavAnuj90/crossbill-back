import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { MongoModule } from './database/mongo.module';
import { RedisModule } from './common/redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ClientsModule } from './modules/clients/clients.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotesModule } from './modules/notes/notes.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { BillingModule } from './modules/billing/billing.module';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { AgreementTemplatesModule } from './modules/agreement-templates/agreement-templates.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { LettersModule } from './modules/letters/letters.module';
import { LifecycleModule } from './modules/lifecycle/lifecycle.module';
import { AadhaarModule } from './modules/aadhaar/aadhaar.module';
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
    NotesModule,
    PaymentsModule,
    BillingModule,
    AgreementsModule,
    ConsentsModule,
    AgreementTemplatesModule,
    EmployeesModule,
    AttendanceModule,
    PayrollModule,
    LettersModule,
    LifecycleModule,
    AadhaarModule,
    NotificationsModule,
    AuditModule,
    HealthModule,
  ],
  // Order matters: JwtAuthGuard must run BEFORE RolesGuard so req.user (and its role) is set.
  // Both are registered as APP_GUARD so they execute in this exact order.
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
