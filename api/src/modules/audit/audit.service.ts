import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventLog } from './schemas/event-log.schema';

export interface AuditEntry {
  action: string;
  orgId?: string;
  userId?: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
}

/** Writes audit events to MongoDB (design §8, §17). Never logs secrets or full bank numbers. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectModel(EventLog.name) private readonly eventLog: Model<EventLog>) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.eventLog.create(entry);
    } catch (err: any) {
      // Audit must never break the request path; surface for alerting instead.
      this.logger.error(`Failed to write audit log for ${entry.action}: ${err.message}`);
    }
  }
}
