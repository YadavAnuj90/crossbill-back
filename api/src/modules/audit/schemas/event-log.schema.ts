import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EventLogDocument = HydratedDocument<EventLog>;

/** Audit trail of security-relevant user/system actions (design §8, §17). */
@Schema({ collection: 'event_logs', timestamps: { createdAt: true, updatedAt: false } })
export class EventLog {
  @Prop({ required: true, index: true })
  action: string;

  @Prop({ index: true })
  orgId?: string;

  @Prop()
  userId?: string;

  @Prop()
  resourceId?: string;

  @Prop({ type: Object })
  meta?: Record<string, unknown>;
}

export const EventLogSchema = SchemaFactory.createForClass(EventLog);
