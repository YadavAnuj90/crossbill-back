import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';
import { DEFAULT_FX_RATE_BASIS, FxRateBasis } from '../../../common/constants/compliance';

export interface CapturedRate {
  rate: number;
  source: string;
  rateDate: string;
}

/**
 * Captures the currency->INR rate used on an invoice and stores it immutably (design §8, §12).
 * Rates are cached in Redis per (basis, currency, date). The upstream fetch is stubbed — wire
 * the CA-confirmed RBI/CBIC source before production.
 */
@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private static readonly TTL_SECONDS = 60 * 60 * 12;

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

  private async fetchUpstream(currency: string, onDate: string, basis: FxRateBasis): Promise<number> {
    this.logger.warn(
      `Using STUB FX rate for ${currency} on ${onDate} (${basis}). Wire the real source before production.`,
    );
    const placeholders: Record<string, number> = { USD: 83.5, EUR: 90.2, GBP: 105.7 };
    return placeholders[currency.toUpperCase()] ?? 83.0;
  }
}
