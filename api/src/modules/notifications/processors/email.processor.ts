import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ResendProvider } from '../providers/resend.provider';
import { QUEUES, JOBS } from '../../../queue/queue.constants';

/** Delivers queued emails via Resend with retry/backoff (design §13). */
@Processor(QUEUES.EMAIL)
export class EmailProcessor extends WorkerHost {
  constructor(private readonly resend: ResendProvider) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== JOBS.SEND_EMAIL) return;
    const { to, subject, html } = job.data;
    await this.resend.send({ to, subject, html });
  }
}
