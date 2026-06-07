import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type RemittanceDocument = HydratedDocument<Remittance>;

/**
 * Foreign inward remittance against an export invoice (design §8). The FIRC / e-FIRA is the
 * bank's proof of realisation and the key evidence of export for FEMA/GST.
 */
@Schema({ collection: 'remittances', ...baseSchemaOptions })
export class Remittance {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, required: true, index: true })
  invoiceId: string;

  // Money as a fixed-2 string to avoid float drift (design §8).
  @Prop({ type: String, required: true })
  amountReceived: string;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, required: true })
  receivedDate: string;

  /** RBI BoP purpose code (e.g. P0802). */
  @Prop({ type: String, required: true })
  purposeCode: string;

  /** Scoped download URL for the stored FIRC/e-FIRA, set after upload. */
  @Prop({ type: String, default: null })
  fircDocUrl: string | null;

  /** Internal storage key (disk/object store path). */
  @Prop({ type: String, default: null })
  fircStorageKey: string | null;

  @Prop({ type: String, default: null })
  fircFilename: string | null;

  @Prop({ type: String, default: null })
  notes: string | null;
}

export const RemittanceSchema = SchemaFactory.createForClass(Remittance);
