import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';
import { DEFAULT_FX_RATE_BASIS, FxRateBasis } from '../../../common/constants/compliance';

export interface CapturedRate {
  rate: number;
  source: string;     // e.g. 'CBIC_NOTIFIED' or 'RBI_REFERENCE'
  rateDate: string;   // ISO date the rate applies to
}

/**
 * Captures the currency→INR rate used on an invoice and stores it immutably on the invoice
 * (design §8, §12). Rates are cached in Redis per (basis, currency, date) to avoid hammering
 * the upstream source. The rate BASIS (RBI reference vs CBIC-notified) must be CA-confirmed.
 *
 * NOTE: the upstream fetch is stubbed here (returns a deterministic placeholder). Wiring it to
 * the live RBI/CBIC source is a Phase-1 follow-up gated on the CA sign-off of the rate basis.
 */
@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private static readonly TTL_SECONDS = 60 * 60 * 12; // 12h

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async capture(
    currency: string,
    onDate: string,
    basis: FxRateBasis = DEFAULT_FX_RATE_BASIS,
  ): Promise<CapturedRate> {
    const key = `fx:${basis}:${currency.toUpperCase()}:${onDate}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const rate = await this.fetchUpstream(currency, onDate, basis);
    const captured: CapturedRate = { rate, source: basis, rateDate: onDate };
    await this.redis.set(key, JSON.stringify(captured), 'EX', ExchangeRateService.TTL_SECONDS);
    return captured;
  }

  /** Placeholder upstream. Replace with the CA-confirmed RBI/CBIC source. */
  private async fetchUpstream(currency: string, onDate: string, basis: FxRateBasis): Promise<number> {
    this.logger.warn(
      `Using STUB FX rate for ${currency} on ${onDate} (${basis}). Wire the real source before production.`,
    );
    const placeholders: Record<string, number> = { USD: 83.5, EUR: 90.2, GBP: 105.7 };
    return placeholders[currency.toUpperCase()] ?? 83.0;
  }
}
