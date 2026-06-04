import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../../common/constants/roles.enum';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type UserDocument = HydratedDocument<User>;

/** User + business profile (design §8): GSTIN, LUT, default SAC, bank details. */
@Schema({ collection: 'users', ...baseSchemaOptions })
export class User {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, default: null })
  passwordHash: string | null;

  @Prop({ type: String, default: null })
  googleId: string | null;

  @Prop({ type: Boolean, default: false })
  emailVerified: boolean;

  @Prop({ type: String, default: null })
  legalName: string | null;

  @Prop({ type: String, default: null })
  gstin: string | null;

  @Prop({ type: String, default: null })
  address: string | null;

  @Prop({ type: String, default: null })
  defaultSac: string | null;

  @Prop({ type: String, default: null })
  bankAccount: string | null;

  @Prop({ type: String, default: null })
  bankIfsc: string | null;

  @Prop({ type: String, default: null })
  lutNumber: string | null;

  @Prop({ type: String, default: null })
  lutFy: string | null;

  @Prop({ type: String, default: null })
  lutArn: string | null;

  @Prop({ type: String, enum: Object.values(Role), default: Role.OWNER })
  role: Role;

  @Prop({ type: String, index: true, default: null })
  orgId: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
