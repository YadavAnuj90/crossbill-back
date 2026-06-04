import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOBS } from '../../queue/queue.constants';

/** Enqueues emails for async delivery (design §13). */
@Injectable()
export class NotificationsService {
  constructor(@InjectQueue(QUEUES.EMAIL) private readonly emailQueue: Queue) {}

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    await this.emailQueue.add(JOBS.SEND_EMAIL, { to, subject, html });
  }
}
