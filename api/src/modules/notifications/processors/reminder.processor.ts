import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES, JOBS } from '../../../queue/queue.constants';

/**
 * Scheduled compliance reminders (design §13):
 *   - fema-aging: daily cron → unpaid invoices at 9/10/11 months → reminder emails
 *   - lut-renewal: annual (early April) → file/renew LUT for the new FY
 *
 * These have legal consequences and must never silently fail (design §18) — idempotent,
 * retried, DLQ on persistent failure. Full query logic lands in the Compliance/Filing phases.
 */
@Processor(QUEUES.EMAIL)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOBS.FEMA_AGING:
        this.logger.log('Running FEMA aging sweep (9/10/11-month nudges)');
        // TODO(phase-2): query unpaid invoices, enqueue send-email per threshold.
        break;
      case JOBS.LUT_RENEWAL:
        this.logger.log('Running annual LUT renewal reminder');
        // TODO(phase-3): email all users to renew LUT for the new FY.
        break;
      default:
        break;
    }
  }
}
