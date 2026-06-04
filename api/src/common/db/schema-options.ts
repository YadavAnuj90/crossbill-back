import { SchemaOptions } from '@nestjs/mongoose';

/**
 * Standard Mongoose options for Crossbill documents:
 * - timestamps -> createdAt / updatedAt
 * - toJSON/toObject expose a string `id` and strip `_id` and `__v`,
 *   so the API response shape matches the frontend types.
 */
export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: any) => {
      ret.id = ret._id?.toString();
      delete ret._id;
      return ret;
    },
  },
  toObject: { virtuals: true },
};
