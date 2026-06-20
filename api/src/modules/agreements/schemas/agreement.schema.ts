import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type AgreementDocument = HydratedDocument<Agreement>;

export type AgreementStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'declined' | 'voided';

/** A single immutable line in the e-signature audit trail (IT Act evidence). */
@Schema({ _id: false })
export class AuditEvent {
  @Prop({ type: String, required: true })
  at: string;

  @Prop({ type: String, required: true })
  event: string;

  @Prop({ type: String, default: null })
  detail: string | null;
}
export const AuditEventSchema = SchemaFactory.createForClass(AuditEvent);

/** A contractual obligation to track through the agreement's life (renewals, deliverables, etc.). */
@Schema({ timestamps: true })
export class Obligation {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, default: null })
  owner: string | null;

  @Prop({ type: String, default: null })
  dueDate: string | null;

  @Prop({ type: Boolean, default: false })
  done: boolean;
}
export const ObligationSchema = SchemaFactory.createForClass(Obligation);

/**
 * An agreement/contract that can be sent to a client for a native electronic signature
 * (email-OTP optional + drawn signature + audit trail). Aadhaar-eSign grade is added later
 * via a GSP/ASP provider; this schema already carries the provider linkage fields.
 */
@Schema({ collection: 'agreements', ...baseSchemaOptions })
export class Agreement {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, default: null })
  clientId: string | null;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, default: 'custom' })
  category: string; // nda | msa | sow | engagement | custom

  @Prop({ type: String, default: null })
  sellerName: string | null;

  @Prop({ type: String, default: null })
  clientName: string | null;

  @Prop({ type: String, default: '' })
  body: string;

  @Prop({ type: String, enum: ['draft', 'sent', 'viewed', 'signed', 'declined', 'voided'], default: 'draft', index: true })
  status: AgreementStatus;

  // ── Signing linkage ──
  @Prop({ type: String, default: null, index: true })
  signToken: string | null;

  @Prop({ type: String, default: null })
  signerName: string | null;

  @Prop({ type: String, default: null })
  signerEmail: string | null;

  @Prop({ type: String, default: null })
  otpHash: string | null;

  @Prop({ type: String, default: null })
  otpExpiresAt: string | null;

  @Prop({ type: Boolean, default: false })
  otpRequired: boolean;

  // ── Signature evidence ──
  @Prop({ type: String, default: null })
  signatureImage: string | null; // data URL of the drawn signature

  @Prop({ type: String, default: null })
  signedName: string | null;

  @Prop({ type: String, default: null })
  signedPdfUrl: string | null;

  @Prop({ type: String, default: null })
  signerIp: string | null;

  @Prop({ type: String, default: null })
  signerUserAgent: string | null;

  // ── Fraud-prevention evidence ──
  @Prop({ type: Number, default: null })
  signerLat: number | null;

  @Prop({ type: Number, default: null })
  signerLng: number | null;

  @Prop({ type: Number, default: null })
  signerGeoAccuracy: number | null;

  @Prop({ type: String, enum: ['ok', 'outside', 'unknown'], default: 'unknown' })
  geoFenceStatus: string;

  @Prop({ type: String, default: null })
  selfieImage: string | null; // data URL — Face Match evidence

  @Prop({ type: String, default: null })
  faceMatchStatus: string | null; // 'matched' | 'unmatched' | 'not_checked' (provider scaffold)

  /** Short public code used by the eSign verifier to confirm authenticity. */
  @Prop({ type: String, default: null, index: true })
  verifyCode: string | null;

  // ── Timeline ──
  @Prop({ type: String, default: null })
  sentAt: string | null;

  @Prop({ type: String, default: null })
  viewedAt: string | null;

  @Prop({ type: String, default: null })
  signedAt: string | null;

  @Prop({ type: String, default: null })
  declinedAt: string | null;

  // ── Aadhaar OTP gate (design §5) ──
  @Prop({ type: Boolean, default: false })
  aadhaarRequired: boolean;

  @Prop({ type: Boolean, default: false })
  aadhaarVerified: boolean;

  @Prop({ type: String, default: null })
  aadhaarLast4: string | null;

  // ── External provider (Aadhaar eSign / DSC) — populated when configured ──
  @Prop({ type: String, default: null })
  esignProvider: string | null;

  @Prop({ type: String, default: null })
  esignRequestId: string | null;

  @Prop({ type: [AuditEventSchema], default: [] })
  auditTrail: AuditEvent[];

  // ── Contract lifecycle ──
  @Prop({ type: String, default: null })
  effectiveDate: string | null;

  @Prop({ type: String, default: null })
  renewalDate: string | null;

  @Prop({ type: String, default: null })
  expiryDate: string | null;

  @Prop({ type: [ObligationSchema], default: [] })
  obligations: Obligation[];

  /** Reminder keys already emailed (e.g. 'renewal-30','expiry-7') — idempotency. */
  @Prop({ type: [String], default: [] })
  lifecycleRemindersSent: string[];
}

export const AgreementSchema = SchemaFactory.createForClass(Agreement);
AgreementSchema.index({ orgId: 1, status: 1, createdAt: -1 });
AgreementSchema.index({ orgId: 1, renewalDate: 1 });
AgreementSchema.index({ orgId: 1, expiryDate: 1 });
