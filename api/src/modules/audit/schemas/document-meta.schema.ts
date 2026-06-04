import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DocumentMetaDocument = HydratedDocument<DocumentMeta>;

/** Uploaded FIRC/e-FIRA file metadata: virus-scan status + checksums (design §8). */
@Schema({ collection: 'document_meta', timestamps: true })
export class DocumentMeta {
  @Prop({ required: true, index: true })
  orgId: string;

  @Prop()
  invoiceId?: string;

  @Prop({ required: true })
  storageKey: string;

  @Prop()
  contentType?: string;

  @Prop()
  sizeBytes?: number;

  @Prop()
  checksumSha256?: string;

  @Prop({ default: 'pending', enum: ['pending', 'clean', 'infected'] })
  scanStatus: string;
}

export const DocumentMetaSchema = SchemaFactory.createForClass(DocumentMeta);
