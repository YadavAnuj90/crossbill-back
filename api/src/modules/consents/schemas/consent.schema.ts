import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type ConsentDocument = HydratedDocument<Consent>;

export type ConsentBasis = 'consent' | 'contract' | 'legal_obligation' | 'legitimate_use';
export type ConsentStatus = 'active' | 'withdrawn' | 'expired';

/**
 * A DPDP Act consent / lawful-basis record for processing a data principal's (client's)
 * personal data. Captures purpose, basis, grant/withdrawal timeline for audit (DPDP §6).
 */
@Schema({ collection: 'consents', ...baseSchemaOptions })
export class Consent {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, default: null })
  clientId: string | null;

  @Prop({ type: String, default: null })
  dataPrincipal: string | null; // name/email of the person, if not a stored client

  @Prop({ type: String, required: true })
  purpose: string; // e.g. "Invoicing & GST compliance"

  @Prop({ type: String, enum: ['consent', 'contract', 'legal_obligation', 'legitimate_use'], default: 'consent' })
  basis: ConsentBasis;

  @Prop({ type: String, enum: ['active', 'withdrawn', 'expired'], default: 'active', index: true })
  status: ConsentStatus;

  @Prop({ type: String, required: true })
  grantedAt: string;

  @Prop({ type: String, default: null })
  expiresAt: string | null;

  @Prop({ type: String, default: null })
  withdrawnAt: string | null;

  @Prop({ type: String, default: null })
  notes: string | null;
}

export const ConsentSchema = SchemaFactory.createForClass(Consent);
ConsentSchema.index({ orgId: 1, status: 1, createdAt: -1 });
