import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES, JOBS } from '../../../queue/queue.constants';

/**
 * Scheduled compliance reminders (design §13): fema-aging (daily) and lut-renewal (annual).
 * These have legal consequences and must never silently fail (design §18).
 */
@Processor(QUEUES.EMAIL)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOBS.FEMA_AGING:
        this.logger.log('Running FEMA aging sweep (9/10/11-month nudges)');
        break;
      case JOBS.LUT_RENEWAL:
        this.logger.log('Running annual LUT renewal reminder');
        break;
      default:
        break;
    }
  }
}
