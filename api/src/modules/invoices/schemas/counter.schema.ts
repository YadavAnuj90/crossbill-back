import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CounterDocument = HydratedDocument<Counter>;

/**
 * Per-(org, financial year) invoice counter. _id is `${orgId}:${financialYear}`.
 * Allocated with an atomic findOneAndUpdate $inc (upsert): sequential + gapless under
 * concurrency (design §8 hard rule) — the Mongo equivalent of the Postgres counter row lock.
 */
@Schema({ collection: 'invoice_counters', versionKey: false })
export class Counter {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: Number, default: 0 })
  seq: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
