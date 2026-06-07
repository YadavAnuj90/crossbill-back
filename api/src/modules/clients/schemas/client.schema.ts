import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type ClientType = 'foreign' | 'domestic';
export type CustomerType = 'b2b' | 'b2c';
export type ClientDocument = HydratedDocument<Client>;

/** A client the exporter bills — foreign (export) or domestic Indian (GST) (design §8). */
@Schema({ collection: 'clients', ...baseSchemaOptions })
export class Client {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, enum: ['foreign', 'domestic'], default: 'foreign', index: true })
  type: ClientType;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ type: String, default: null })
  address: string | null;

  // ── Foreign clients ──
  /** ISO 3166-1 alpha-2 country code (foreign clients). */
  @Prop({ type: String, default: null })
  country: string | null;

  // ── Domestic Indian clients ──
  /** GST state code (place of supply) — required for domestic. */
  @Prop({ type: String, default: null })
  stateCode: string | null;

  /** Buyer GSTIN — present for B2B, null for B2C. */
  @Prop({ type: String, default: null })
  gstin: string | null;

  @Prop({ type: String, enum: ['b2b', 'b2c'], default: null })
  customerType: CustomerType | null;
}

export const ClientSchema = SchemaFactory.createForClass(Client);
