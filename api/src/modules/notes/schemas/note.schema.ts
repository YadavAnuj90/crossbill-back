import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type NoteKind = 'credit' | 'debit';
export type NoteDocument = HydratedDocument<Note>;

/** Embedded line of a credit/debit note (mirrors invoice items). */
@Schema({ _id: false })
export class NoteItem {
  @Prop({ type: String, required: true }) description: string;
  @Prop({ type: String, required: true }) sacCode: string;
  @Prop({ type: String, required: true }) quantity: string;
  @Prop({ type: String, required: true }) unitAmount: string;
  @Prop({ type: String, required: true }) lineTotal: string;
  @Prop({ type: Number, default: 0 }) gstRate: number;
}
export const NoteItemSchema = SchemaFactory.createForClass(NoteItem);

/**
 * Credit / Debit note against an invoice (GST §34). A credit note reduces the supply value
 * (refund/discount/cancellation); a debit note increases it. Each has its own gapless series
 * (CN/… or DN/…) and flows into GSTR-1 CDNR/CDNUR. Tax treatment mirrors the original invoice.
 */
@Schema({ collection: 'notes', ...baseSchemaOptions })
export class Note {
  @Prop({ type: String, required: true, index: true }) orgId: string;

  @Prop({ type: String, enum: ['credit', 'debit'], required: true, index: true }) kind: NoteKind;

  @Prop({ type: String, required: true }) number: string;
  @Prop({ type: String, required: true }) financialYear: string;
  @Prop({ type: String, required: true }) noteDate: string;

  // Original invoice link (GST requires the reference).
  @Prop({ type: String, required: true, index: true }) invoiceId: string;
  @Prop({ type: String, required: true }) invoiceNumber: string;
  @Prop({ type: String, required: true }) invoiceDate: string;

  @Prop({ type: String, required: true }) clientId: string;

  /** 'export' | 'domestic' — inherited from the invoice; drives the tax treatment. */
  @Prop({ type: String, required: true }) invoiceType: string;

  @Prop({ type: String, required: true }) currency: string;
  @Prop({ type: String, default: '1.000000' }) fxRate: string;
  @Prop({ type: String, default: 'NA' }) fxRateSource: string;
  @Prop({ type: String, default: '' }) fxRateDate: string;

  @Prop({ type: String, required: true }) reason: string;

  @Prop({ type: String, default: '0.00' }) subtotal: string;
  @Prop({ type: String, enum: ['LUT_ZERO', 'IGST', 'CGST_SGST'], default: 'LUT_ZERO' }) taxType: string;
  @Prop({ type: String, default: '0.00' }) cgstAmount: string;
  @Prop({ type: String, default: '0.00' }) sgstAmount: string;
  @Prop({ type: String, default: '0.00' }) igstAmount: string;
  @Prop({ type: String, default: '0.00' }) taxTotal: string;
  @Prop({ type: String, default: '0.00' }) grandTotal: string;

  @Prop({ type: String, default: '' }) placeOfSupply: string;
  @Prop({ type: String, default: null }) placeOfSupplyState: string | null;

  @Prop({ type: String, default: null }) pdfUrl: string | null;

  @Prop({ type: [NoteItemSchema], default: [] }) items: NoteItem[];
}

export const NoteSchema = SchemaFactory.createForClass(Note);
NoteSchema.index({ orgId: 1, financialYear: 1, number: 1 }, { unique: true });
