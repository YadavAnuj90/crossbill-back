import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type SalarySlipDocument = HydratedDocument<SalarySlip>;

export type SlipStatus = 'draft' | 'finalised' | 'shared';

/** A monthly salary slip for an employee. Money is stored as fixed-2 strings (₹). */
@Schema({ collection: 'salary_slips', ...baseSchemaOptions })
export class SalarySlip {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, required: true })
  employeeName: string;

  @Prop({ type: String, default: null })
  empCode: string | null;

  @Prop({ type: String, default: null })
  designation: string | null;

  @Prop({ type: String, required: true })
  month: string; // YYYY-MM

  // ── earnings ──
  @Prop({ type: String, default: '0.00' }) basic: string;
  @Prop({ type: String, default: '0.00' }) hra: string;
  @Prop({ type: String, default: '0.00' }) bonus: string;
  @Prop({ type: String, default: '0.00' }) allowances: string;

  // ── deductions ──
  @Prop({ type: String, default: '0.00' }) pf: string;
  @Prop({ type: String, default: '0.00' }) esic: string;
  @Prop({ type: String, default: '0.00' }) tds: string;
  @Prop({ type: String, default: '0.00' }) otherDeductions: string;

  // ── totals ──
  @Prop({ type: String, default: '0.00' }) gross: string;
  @Prop({ type: String, default: '0.00' }) totalDeductions: string;
  @Prop({ type: String, default: '0.00' }) net: string;

  @Prop({ type: String, enum: ['draft', 'finalised', 'shared'], default: 'draft', index: true })
  status: SlipStatus;

  @Prop({ type: String, default: null })
  pdfUrl: string | null;

  @Prop({ type: String, default: null })
  generatedAt: string | null;

  @Prop({ type: String, default: null })
  finalisedAt: string | null;

  @Prop({ type: String, default: null })
  finalisedBy: string | null;
}

export const SalarySlipSchema = SchemaFactory.createForClass(SalarySlip);

// Additive computed aliases — exposed in API responses without altering stored
// shape (frontend keeps reading gross/net/totalDeductions; these are extras).
SalarySlipSchema.virtual('grossEarnings').get(function (this: SalarySlip) {
  return this.gross;
});
SalarySlipSchema.virtual('netPay').get(function (this: SalarySlip) {
  return this.net;
});

SalarySlipSchema.index({ orgId: 1, employeeId: 1, month: 1 }, { unique: true });
SalarySlipSchema.index({ orgId: 1, month: 1 });
