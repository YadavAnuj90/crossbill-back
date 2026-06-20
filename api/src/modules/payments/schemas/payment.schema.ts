import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type PaymentDocument = HydratedDocument<Payment>;

export type PaymentPurpose = 'invoice' | 'subscription';
export type PaymentStatus = 'created' | 'paid' | 'cancelled' | 'expired' | 'failed';

/**
 * A Razorpay payment link raised for either an invoice (get-paid + auto-reconcile)
 * or a subscription/plan upgrade (billing). Status is driven by webhooks.
 */
@Schema({ collection: 'payments', ...baseSchemaOptions })
export class Payment {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, enum: ['invoice', 'subscription'], default: 'invoice', index: true })
  purpose: PaymentPurpose;

  @Prop({ type: String, default: null })
  invoiceId: string | null;

  @Prop({ type: String, default: null })
  invoiceNumber: string | null;

  @Prop({ type: String, default: null })
  planId: string | null;

  @Prop({ type: String, default: 'razorpay' })
  provider: string;

  @Prop({ type: String, required: true, index: true })
  razorpayLinkId: string;

  @Prop({ type: String, required: true })
  shortUrl: string;

  /** Amount in major units (e.g. "1180.00") and the currency it was charged in. */
  @Prop({ type: String, required: true })
  amount: string;

  @Prop({ type: Number, required: true })
  amountPaise: number;

  @Prop({ type: String, default: 'INR' })
  currency: string;

  @Prop({ type: String, enum: ['created', 'paid', 'cancelled', 'expired', 'failed'], default: 'created', index: true })
  status: PaymentStatus;

  @Prop({ type: String, default: null })
  razorpayPaymentId: string | null;

  @Prop({ type: String, default: null })
  paidAt: string | null;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ orgId: 1, invoiceId: 1 });
