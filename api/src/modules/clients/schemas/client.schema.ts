import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type ClientDocument = HydratedDocument<Client>;

/** Foreign client billed by the exporter (design §8). */
@Schema({ collection: 'clients', ...baseSchemaOptions })
export class Client {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ type: String, default: null })
  address: string | null;

  /** ISO 3166-1 alpha-2 country code. */
  @Prop({ type: String, required: true })
  country: string;
}

export const ClientSchema = SchemaFactory.createForClass(Client);
