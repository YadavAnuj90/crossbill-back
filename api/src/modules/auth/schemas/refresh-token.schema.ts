import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

/** Server-side refresh token (design §9). Stored HASHED; rotated; revocable. */
@Schema({ collection: 'refresh_tokens', ...baseSchemaOptions })
export class RefreshToken {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, index: true })
  familyId: string;

  @Prop({ type: String, required: true })
  tokenHash: string;

  @Prop({ type: Boolean, default: false })
  revoked: boolean;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
