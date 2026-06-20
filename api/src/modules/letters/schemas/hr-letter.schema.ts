import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type HrLetterDocument = HydratedDocument<HrLetter>;

export type LetterKind = 'offer' | 'experience' | 'relieving';
export type LetterStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

/** A generated HR letter (offer/experience/relieving) for an employee, tenant-scoped. */
@Schema({ collection: 'hr_letters', ...baseSchemaOptions })
export class HrLetter {
  @Prop({ type: String, required: true, index: true })
  orgId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  @Prop({ type: String, required: true })
  employeeName: string;

  @Prop({ type: String, enum: ['offer', 'experience', 'relieving'], required: true, index: true })
  kind: LetterKind;

  @Prop({ type: String, enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'], default: 'draft', index: true })
  status: LetterStatus;

  // ── snapshot fields (kind-dependent) ──
  @Prop({ type: String, default: null }) designation: string | null;
  @Prop({ type: String, default: null }) department: string | null;
  @Prop({ type: String, default: null }) joiningDate: string | null;
  @Prop({ type: String, default: null }) ctc: string | null;          // offer
  @Prop({ type: String, default: null }) reportingManager: string | null;
  @Prop({ type: String, default: null }) fromDate: string | null;     // experience
  @Prop({ type: String, default: null }) toDate: string | null;       // experience / relieving (last working day)

  @Prop({ type: String, default: null }) pdfUrl: string | null;
  @Prop({ type: String, default: null }) generatedAt: string | null;
  @Prop({ type: String, default: null }) sentAt: string | null;
  @Prop({ type: String, default: null }) decidedAt: string | null;
}

export const HrLetterSchema = SchemaFactory.createForClass(HrLetter);
HrLetterSchema.index({ orgId: 1, kind: 1, createdAt: -1 });
HrLetterSchema.index({ orgId: 1, employeeId: 1 });
