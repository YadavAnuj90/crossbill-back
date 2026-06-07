import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
export type InvoiceType = 'export' | 'domestic';
export type InvoiceTaxType = 'LUT_ZERO' | 'IGST' | 'CGST_SGST';
export type InvoiceDocument = HydratedDocument<Invoice>;

/** Embedded line item. SAC/HSN code + (for domestic) the per-line GST rate (design §8, §12). */
@Schema({ _id: false })
export class InvoiceItem {
  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true })
  sacCode: string;

  @Prop({ type: String, required: true })
  quantity: string;

  @Prop({ type: String, required: true })
  unitAmount: string;

  @Prop({ type: String, required: true })
  lineTotal: string;

  /** GST rate % for domestic invoices (0 for exports). */
  @Prop({ type: Number, default: 0 })
  gstRate: number;
}
export const InvoiceItemSchema = SchemaFactory.createForClass(InvoiceItem);

/**
 * Invoice — export (foreign client, zero-rated under LUT) OR domestic (Indian client, GST).
 * `number` is sequential + gapless per (orgId, FY) across BOTH types (shared series).
 * Money is stored as fixed-2 strings. For domestic: cgst/sgst/igst breakup + grandTotal.
 */
@Schema({ collection: 'invoices', ...baseSchemaOptions })
export class Invoice {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, enum: ['export', 'domestic'], default: 'export', index: true })
  type: InvoiceType;

  @Prop({ type: String, required: true })
  clientId: string;

  @Prop({ type: String, required: true })
  number: string;

  @Prop({ type: String, required: true })
  financialYear: string;

  @Prop({ type: String, required: true })
  invoiceDate: string;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, required: true })
  fxRate: string;

  @Prop({ type: String, required: true })
  fxRateSource: string;

  @Prop({ type: String, required: true })
  fxRateDate: string;

  @Prop({ type: String, default: '0.00' })
  subtotal: string;

  @Prop({ type: String, default: '0.00' })
  inrEquivalent: string;

  // ── Domestic GST breakup (zeros for exports) ──
  @Prop({ type: String, enum: ['LUT_ZERO', 'IGST', 'CGST_SGST'], default: 'LUT_ZERO' })
  taxType: InvoiceTaxType;

  @Prop({ type: String, default: '0.00' })
  cgstAmount: string;

  @Prop({ type: String, default: '0.00' })
  sgstAmount: string;

  @Prop({ type: String, default: '0.00' })
  igstAmount: string;

  @Prop({ type: String, default: '0.00' })
  taxTotal: string;

  /** Subtotal + tax (in the invoice currency). For exports this equals subtotal. */
  @Prop({ type: String, default: '0.00' })
  grandTotal: string;

  @Prop({ type: String, required: true })
  declarationText: string;

  @Prop({ type: String, required: true })
  placeOfSupply: string;

  /** Domestic place-of-supply state code (e.g. '27'); null for exports. */
  @Prop({ type: String, default: null })
  placeOfSupplyState: string | null;

  @Prop({ type: String, enum: ['draft', 'sent', 'paid', 'overdue'], default: 'draft', index: true })
  status: InvoiceStatus;

  /** FEMA realisation deadline — exports only; null for domestic. */
  @Prop({ type: String, default: null })
  femaDueDate: string | null;

  @Prop({ type: String, default: null })
  pdfUrl: string | null;

  /** Idempotency keys for FEMA reminders already sent (exports only). */
  @Prop({ type: [String], default: [] })
  femaRemindersSent: string[];

  @Prop({ type: [InvoiceItemSchema], default: [] })
  items: InvoiceItem[];
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ orgId: 1, financialYear: 1, number: 1 }, { unique: true });
