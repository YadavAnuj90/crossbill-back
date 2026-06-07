import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FemaReminderService } from './fema-reminder.service';
import { ReminderProcessor } from './processors/reminder.processor';
import { RemindersScheduler } from './reminders.scheduler';
import { RemindersController } from './reminders.controller';
import { InvoicesModule } from '../invoices/invoices.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { QUEUES } from '../../queue/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.REMINDERS }),
    InvoicesModule,
    OrganizationsModule,
    UsersModule,
    NotificationsModule,
    AuditModule,
  ],
  providers: [FemaReminderService, ReminderProcessor, RemindersScheduler],
  controllers: [RemindersController],
})
export class RemindersModule {}
