import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { ResendProvider } from './providers/resend.provider';
import { EmailProcessor } from './processors/email.processor';
import { ReminderProcessor } from './processors/reminder.processor';
import { QUEUES } from '../../queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.EMAIL })],
  providers: [NotificationsService, ResendProvider, EmailProcessor, ReminderProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
