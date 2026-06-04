import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
export type InvoiceDocument = HydratedDocument<Invoice>;

/** Embedded line item with its own SAC code (design §8, §12). */
@Schema({ _id: false })
export class InvoiceItem {
  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true })
  sacCode: string;

  // Money kept as fixed-2 strings to avoid float drift (design §8).
  @Prop({ type: String, required: true })
  quantity: string;

  @Prop({ type: String, required: true })
  unitAmount: string;

  @Prop({ type: String, required: true })
  lineTotal: string;
}
export const InvoiceItemSchema = SchemaFactory.createForClass(InvoiceItem);

/**
 * Export invoice (design §8). `number` is sequential + gapless per (orgId, financialYear),
 * allocated via an atomic Mongo counter (see InvoiceNumberService). Monetary values are
 * stored as fixed-2 strings.
 */
@Schema({ collection: 'invoices', ...baseSchemaOptions })
export class Invoice {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

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

  @Prop({ type: String, required: true })
  declarationText: string;

  @Prop({ type: String, required: true })
  placeOfSupply: string;

  @Prop({ type: String, enum: ['draft', 'sent', 'paid', 'overdue'], default: 'draft', index: true })
  status: InvoiceStatus;

  @Prop({ type: String, required: true })
  femaDueDate: string;

  @Prop({ type: String, default: null })
  pdfUrl: string | null;

  @Prop({ type: [InvoiceItemSchema], default: [] })
  items: InvoiceItem[];
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ orgId: 1, financialYear: 1, number: 1 }, { unique: true });
