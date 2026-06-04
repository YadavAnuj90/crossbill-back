import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter, CounterDocument } from '../schemas/counter.schema';

/**
 * Sequential, gapless invoice numbering per (org, financial year) — design §8 hard rule.
 *
 * Allocation uses an atomic findOneAndUpdate with $inc and upsert on the counter doc whose
 * _id is `${orgId}:${financialYear}`. MongoDB serialises concurrent updates to the same
 * document, so two concurrent creators can never observe the same seq — no gaps, no dupes.
 * This is the Mongo equivalent of the Postgres per-FY counter row lock.
 */
@Injectable()
export class InvoiceNumberService {
  constructor(@InjectModel(Counter.name) private readonly counters: Model<CounterDocument>) {}

  async allocate(orgId: string, financialYear: string): Promise<string> {
    const doc = await this.counters
      .findByIdAndUpdate(
        `${orgId}:${financialYear}`,
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      )
      .exec();
    return this.format(financialYear, doc.seq);
  }

  async peekNext(orgId: string, financialYear: string): Promise<string> {
    const doc = await this.counters.findById(`${orgId}:${financialYear}`).exec();
    return this.format(financialYear, (doc?.seq ?? 0) + 1);
  }

  format(financialYear: string, seq: number): string {
    return `CB/${financialYear}/${String(seq).padStart(4, '0')}`;
  }
}
