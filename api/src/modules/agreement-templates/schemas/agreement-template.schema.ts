import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type AgreementTemplateDocument = HydratedDocument<AgreementTemplate>;

/**
 * A reusable agreement template. The body may contain {{merge_fields}} which are
 * substituted when an agreement is created from the template (document automation).
 */
@Schema({ collection: 'agreement_templates', ...baseSchemaOptions })
export class AgreementTemplate {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: 'custom' })
  category: string; // nda | msa | sow | engagement | custom

  @Prop({ type: String, default: '' })
  body: string;

  /** Distinct {{field}} names discovered in the body, e.g. ['client_name', 'amount']. */
  @Prop({ type: [String], default: [] })
  fields: string[];
}

export const AgreementTemplateSchema = SchemaFactory.createForClass(AgreementTemplate);
AgreementTemplateSchema.index({ orgId: 1, createdAt: -1 });
