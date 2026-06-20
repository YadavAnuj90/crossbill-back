import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type ExitDocument = HydratedDocument<Exit>;

/** An asset to be returned during exit clearance. */
@Schema({ _id: true })
export class AssetItem {
  @Prop({ type: String, required: true })
  asset: string;

  @Prop({ type: Boolean, default: false })
  returned: boolean;
}
export const AssetItemSchema = SchemaFactory.createForClass(AssetItem);

/** Employee exit / offboarding flow (tenant-scoped). */
@Schema({ collection: 'exits', ...baseSchemaOptions })
export class Exit {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, required: true })
  employeeName: string;

  @Prop({ type: String, required: true })
  resignationDate: string;

  @Prop({ type: String, default: null })
  lastWorkingDate: string | null;

  @Prop({ type: Number, default: 30 })
  noticeDays: number;

  @Prop({ type: String, default: null })
  reason: string | null;

  @Prop({ type: [AssetItemSchema], default: [] })
  assets: AssetItem[];

  @Prop({ type: Boolean, default: false })
  managerApproved: boolean;

  @Prop({ type: Boolean, default: false })
  hrApproved: boolean;

  @Prop({ type: String, default: '0.00' })
  finalSettlement: string;

  @Prop({ type: String, default: null })
  settlementNotes: string | null;

  @Prop({ type: String, enum: ['initiated', 'notice', 'cleared', 'settled'], default: 'initiated', index: true })
  status: string;

  @Prop({ type: String, default: null })
  completedAt: string | null;
}

export const ExitSchema = SchemaFactory.createForClass(Exit);
ExitSchema.index({ orgId: 1, status: 1, createdAt: -1 });
