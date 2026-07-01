import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOBS } from '../../queue/queue.constants';

/**
 * Registers the repeatable compliance sweeps (design §13). Idempotent: BullMQ dedupes repeatable
 * jobs by name + cron pattern, so re-registering on every boot is safe.
 */
@Injectable()
export class RemindersScheduler implements OnModuleInit {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(@InjectQueue(QUEUES.REMINDERS) private readonly queue: Queue) {}

  async onModuleInit() {
    try {
      // FEMA aging: every day at 07:00.
      await this.queue.add(JOBS.FEMA_SWEEP, {}, {
        repeat: { pattern: '0 7 * * *' }, jobId: 'cron-fema-sweep',
        removeOnComplete: true, removeOnFail: 50,
      });
      // LUT renewal: 06:00 on 1 April.
      await this.queue.add(JOBS.LUT_SWEEP, {}, {
        repeat: { pattern: '0 6 1 4 *' }, jobId: 'cron-lut-sweep',
        removeOnComplete: true, removeOnFail: 50,
      });
      this.logger.log('Compliance sweeps scheduled (FEMA daily 07:00, LUT 1 Apr 06:00).');
    } catch (e: any) {
      this.logger.error(`Failed to schedule reminder jobs: ${e.message}`);
    }
  }

  /** Manual trigger (used by the admin endpoint) — runs the FEMA sweep immediately. */
  async runFemaNow() {
    await this.queue.add(JOBS.FEMA_SWEEP, { manual: true }, { removeOnComplete: true });
  }
}
