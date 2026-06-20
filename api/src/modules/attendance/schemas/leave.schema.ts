import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type LeaveDocument = HydratedDocument<Leave>;

export type LeaveType = 'casual' | 'sick' | 'earned' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

/** An employee leave request + its approval state (tenant-scoped). */
@Schema({ collection: 'leaves', ...baseSchemaOptions })
export class Leave {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, enum: ['casual', 'sick', 'earned', 'unpaid'], default: 'casual' })
  type: LeaveType;

  @Prop({ type: String, required: true })
  from: string; // YYYY-MM-DD

  @Prop({ type: String, required: true })
  to: string; // YYYY-MM-DD

  @Prop({ type: Number, required: true })
  days: number;

  @Prop({ type: String, default: null })
  reason: string | null;

  @Prop({ type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true })
  status: LeaveStatus;

  @Prop({ type: String, default: null })
  approverId: string | null;

  @Prop({ type: String, default: null })
  decidedAt: string | null;
}

export const LeaveSchema = SchemaFactory.createForClass(Leave);
LeaveSchema.index({ orgId: 1, status: 1, createdAt: -1 });
LeaveSchema.index({ orgId: 1, employeeId: 1 });
