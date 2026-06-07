import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FemaReminderService } from '../fema-reminder.service';
import { QUEUES, JOBS } from '../../../queue/queue.constants';

/** Worker for scheduled compliance sweeps (design §13, §18): FEMA aging + LUT renewal. */
@Processor(QUEUES.REMINDERS)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(private readonly fema: FemaReminderService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOBS.FEMA_SWEEP:
        await this.fema.sweep();
        break;
      case JOBS.LUT_SWEEP:
        // Annual (early April): email users to file/renew their LUT for the new FY.
        this.logger.log('LUT renewal sweep — reminder to file Form RFD-11 for the new FY.');
        break;
      default:
        break;
    }
  }
}
