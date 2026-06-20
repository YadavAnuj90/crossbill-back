import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../../common/db/schema-options';

export type OrganizationDocument = HydratedDocument<Organization>;

/** An allowed signing geofence — signers outside every fence are flagged (fraud prevention). */
@Schema({ _id: false })
export class SignGeofence {
  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: Number, required: true })
  lat: number;

  @Prop({ type: Number, required: true })
  lng: number;

  @Prop({ type: Number, required: true })
  radiusKm: number;
}
export const SignGeofenceSchema = SchemaFactory.createForClass(SignGeofence);

/** Tenant root. Every other record carries an orgId (design §8, §10). */
@Schema({ collection: 'organizations', ...baseSchemaOptions })
export class Organization {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  ownerId: string | null;

  @Prop({ type: String, default: 'free' })
  plan: string;

  @Prop({ type: String, default: null })
  planActivatedAt: string | null;

  @Prop({ type: String, default: null })
  razorpaySubscriptionId: string | null;

  /** Allowed signing geofences. Empty = signing allowed from anywhere. */
  @Prop({ type: [SignGeofenceSchema], default: [] })
  signGeofences: SignGeofence[];

  // ── Company verification & setup (design §2) ──
  @Prop({ type: String, default: null })
  gstin: string | null;

  @Prop({ type: String, default: null })
  pan: string | null;

  @Prop({ type: String, default: null })
  registeredAddress: string | null;

  @Prop({ type: String, default: null })
  logoUrl: string | null;

  @Prop({ type: String, default: null })
  website: string | null;

  @Prop({ type: String, default: null })
  ownerName: string | null;

  @Prop({ type: String, default: null })
  ownerEmail: string | null;

  @Prop({ type: String, default: null })
  ownerMobile: string | null;

  @Prop({ type: String, enum: ['unsubmitted', 'pending', 'verified', 'rejected'], default: 'unsubmitted' })
  verificationStatus: string;

  @Prop({ type: String, default: null })
  verificationNotes: string | null;

  @Prop({ type: String, default: null })
  verificationSubmittedAt: string | null;

  @Prop({ type: String, default: null })
  verifiedAt: string | null;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
