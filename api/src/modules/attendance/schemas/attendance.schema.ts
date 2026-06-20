import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type AttendanceDocument = HydratedDocument<Attendance>;

export type AttendanceStatus = 'present' | 'absent' | 'half' | 'leave';

/** A single day's attendance for an employee (tenant-scoped). */
@Schema({ collection: 'attendance', ...baseSchemaOptions })
export class Attendance {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, required: true })
  date: string; // YYYY-MM-DD

  @Prop({ type: String, default: null })
  checkInAt: string | null;

  @Prop({ type: String, default: null })
  checkOutAt: string | null;

  @Prop({ type: Number, default: 0 })
  workedMinutes: number;

  @Prop({ type: String, enum: ['present', 'absent', 'half', 'leave'], default: 'present' })
  status: AttendanceStatus;

  @Prop({ type: String, default: 'web' })
  source: string;

  @Prop({ type: String, default: null })
  ip: string | null;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
AttendanceSchema.index({ orgId: 1, employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ orgId: 1, date: 1 });
