import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type EInvoiceStatus = 'generated' | 'cancelled';
export type EInvoiceDocument = HydratedDocument<EInvoice>;

/**
 * GST e-invoice (IRN) record for an invoice. One per invoice (orgId + invoiceId unique).
 * Mirrors what an IRP returns: IRN, acknowledgement, the signed invoice (JWS) and the
 * signed QR string — plus a rendered QR image (data URL) for display/PDF.
 */
@Schema({ collection: 'einvoices', ...baseSchemaOptions })
export class EInvoice {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, required: true })
  invoiceId: string;

  // Snapshot fields so the e-invoicing list view is self-contained.
  @Prop({ type: String, required: true })
  invoiceNumber: string;

  @Prop({ type: String, required: true })
  invoiceDate: string;

  @Prop({ type: String, default: '0.00' })
  totalValue: string;

  @Prop({ type: String, default: 'INR' })
  currency: string;

  // ── IRP response ──
  @Prop({ type: String, required: true })
  irn: string;

  @Prop({ type: String, default: null })
  ackNo: string | null;

  @Prop({ type: String, default: null })
  ackDate: string | null;

  /** Signed invoice (JWS) returned by the IRP. */
  @Prop({ type: String, default: null })
  signedInvoice: string | null;

  /** Signed QR payload (JWS) returned by the IRP — this is what the QR encodes. */
  @Prop({ type: String, default: null })
  signedQr: string | null;

  /** Rendered scannable QR as a PNG data URL (null if the qrcode lib isn't installed). */
  @Prop({ type: String, default: null })
  qrImage: string | null;

  @Prop({ type: String, enum: ['generated', 'cancelled'], default: 'generated', index: true })
  status: EInvoiceStatus;

  @Prop({ type: String, default: 'sandbox' })
  provider: string;

  @Prop({ type: Boolean, default: true })
  sandbox: boolean;

  @Prop({ type: String, default: null })
  generatedAt: string | null;

  @Prop({ type: String, default: null })
  cancelledAt: string | null;

  @Prop({ type: String, default: null })
  cancelReason: string | null;
}

export const EInvoiceSchema = SchemaFactory.createForClass(EInvoice);
EInvoiceSchema.index({ orgId: 1, invoiceId: 1 }, { unique: true });
EInvoiceSchema.index({ orgId: 1, status: 1, createdAt: -1 });
