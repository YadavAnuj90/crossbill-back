import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type OrganizationDocument = HydratedDocument<Organization>;

/** Tenant root. Every other record carries an orgId (design §8, §10). */
@Schema({ collection: 'organizations', ...baseSchemaOptions })
export class Organization {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  ownerId: string | null;

  @Prop({ type: String, default: 'free' })
  plan: string;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
