import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type EmployeeDocument = HydratedDocument<Employee>;

export type EmploymentType = 'full_time' | 'contract' | 'intern';
export type EmployeeStatus = 'onboarding' | 'active' | 'on_notice' | 'exited';

/** An uploaded employee document (offer, ID proof, certificate, etc.). */
@Schema({ _id: true, timestamps: true })
export class EmployeeDoc {
  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: String, required: true })
  url: string;
}
export const EmployeeDocSchema = SchemaFactory.createForClass(EmployeeDoc);

/** A company employee (HR record), tenant-scoped by orgId. */
@Schema({ collection: 'employees', ...baseSchemaOptions })
export class Employee {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, required: true })
  empCode: string; // company-unique Employee ID

  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, default: '' })
  lastName: string;

  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ type: String, default: null })
  mobile: string | null;

  @Prop({ type: String, default: null })
  department: string | null;

  @Prop({ type: String, default: null })
  designation: string | null;

  @Prop({ type: String, default: null })
  joiningDate: string | null;

  @Prop({ type: String, enum: ['onboarding', 'active', 'on_notice', 'exited'], default: 'active', index: true })
  status: EmployeeStatus;

  @Prop({ type: String, enum: ['full_time', 'contract', 'intern'], default: 'full_time' })
  employmentType: EmploymentType;

  @Prop({ type: String, default: null })
  reportingManager: string | null;

  /** Annual CTC, fixed-2 string (minor units avoided for readability). */
  @Prop({ type: String, default: '0.00' })
  ctcAnnual: string;

  // ── profile ──
  @Prop({ type: String, default: null })
  dob: string | null;

  @Prop({ type: String, default: null })
  address: string | null;

  @Prop({ type: String, default: null })
  emergencyContact: string | null;

  @Prop({ type: [EmployeeDocSchema], default: [] })
  documents: EmployeeDoc[];
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
EmployeeSchema.index({ orgId: 1, empCode: 1 }, { unique: true });
EmployeeSchema.index({ orgId: 1, status: 1, createdAt: -1 });
