import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DocumentMetaDocument = HydratedDocument<DocumentMeta>;

/** Uploaded FIRC/e-FIRA file metadata: virus-scan status + checksums (design §8). */
@Schema({ collection: 'document_meta', timestamps: true })
export class DocumentMeta {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String })
  invoiceId?: string;

  @Prop({ type: String, required: true })
  storageKey: string;

  @Prop({ type: String })
  contentType?: string;

  @Prop({ type: Number })
  sizeBytes?: number;

  @Prop({ type: String })
  checksumSha256?: string;

  @Prop({ type: String, default: 'pending', enum: ['pending', 'clean', 'infected'] })
  scanStatus: string;
}

export const DocumentMetaSchema = SchemaFactory.createForClass(DocumentMeta);
