import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type AadhaarVerificationDocument = HydratedDocument<AadhaarVerification>;

/**
 * An Aadhaar OTP verification event. NEVER stores the full Aadhaar number or OTP —
 * only a masked last-4 + provider reference (design §5, DPDP minimisation).
 */
@Schema({ collection: 'aadhaar_verifications', ...baseSchemaOptions })
export class AadhaarVerification {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, default: null, index: true })
  agreementId: string | null;

  @Prop({ type: String, default: 'aadhaar_otp' })
  channel: string;

  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String, required: true, index: true })
  referenceId: string;

  @Prop({ type: String, default: null })
  aadhaarLast4: string | null;

  @Prop({ type: String, enum: ['initiated', 'otp_sent', 'verified', 'failed', 'expired'], default: 'initiated', index: true })
  status: string;

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: String, default: null })
  ip: string | null;

  @Prop({ type: String, default: null })
  userAgent: string | null;

  @Prop({ type: String, default: null })
  verifiedAt: string | null;
}

export const AadhaarVerificationSchema = SchemaFactory.createForClass(AadhaarVerification);
AadhaarVerificationSchema.index({ orgId: 1, createdAt: -1 });
