import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type OnboardingDocument = HydratedDocument<Onboarding>;

/** A checklist item in an onboarding flow. */
@Schema({ _id: true })
export class ChecklistItem {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: Boolean, default: true })
  required: boolean;

  @Prop({ type: Boolean, default: false })
  done: boolean;

  @Prop({ type: String, default: null })
  docUrl: string | null;
}
export const ChecklistItemSchema = SchemaFactory.createForClass(ChecklistItem);

/** Employee onboarding: a checklist + document references (tenant-scoped). */
@Schema({ collection: 'onboardings', ...baseSchemaOptions })
export class Onboarding {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: [ChecklistItemSchema], default: [] })
  checklist: ChecklistItem[];

  @Prop({ type: String, enum: ['in_progress', 'complete'], default: 'in_progress' })
  status: string;

  @Prop({ type: String, default: null })
  completedAt: string | null;
}

export const OnboardingSchema = SchemaFactory.createForClass(Onboarding);
OnboardingSchema.index({ orgId: 1, employeeId: 1 }, { unique: true });
