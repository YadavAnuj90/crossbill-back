import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type PayrollRunDocument = HydratedDocument<PayrollRun>;

/** A monthly payroll run summarising all slips for a period. */
@Schema({ collection: 'payroll_runs', ...baseSchemaOptions })
export class PayrollRun {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, required: true })
  period: string; // YYYY-MM

  @Prop({ type: String, enum: ['draft', 'finalised'], default: 'draft' })
  status: string;

  @Prop({ type: String, default: '0.00' }) gross: string;
  @Prop({ type: String, default: '0.00' }) deductions: string;
  @Prop({ type: String, default: '0.00' }) net: string;

  @Prop({ type: Number, default: 0 })
  slipCount: number;

  @Prop({ type: String, default: null })
  finalisedAt: string | null;
}

export const PayrollRunSchema = SchemaFactory.createForClass(PayrollRun);
PayrollRunSchema.index({ orgId: 1, period: 1 }, { unique: true });
