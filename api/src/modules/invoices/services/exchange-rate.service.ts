import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';
import { DEFAULT_FX_RATE_BASIS, FxRateBasis } from '../../../common/constants/compliance';

export interface CapturedRate {
  rate: number;
  source: string;
  rateDate: string;
}

/** Static fallback used only if the live source is unreachable. */
const FALLBACK: Record<string, number> = { USD: 83.5, EUR: 90.2, GBP: 105.7, AUD: 55.4, CAD: 61.2, SGD: 62.0, AED: 22.7 };

/**
 * Captures the currency→INR rate used on an invoice and stores it immutably (design §8, §12).
 * Rates come from a LIVE reference source (ECB via frankfurter.app — free, supports historical
 * dates) and are cached in Redis per (currency, date). If the source is unreachable we fall back
 * to a static rate and flag it. The exact CBIC/RBI basis must still be CA-confirmed.
 */
@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private static readonly TTL_SECONDS = 60 * 60 * 12;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async capture(
    currency: string,
    onDate: string,
    _basis: FxRateBasis = DEFAULT_FX_RATE_BASIS,
  ): Promise<CapturedRate> {
    const cur = currency.toUpperCase();
    if (cur === 'INR') return { rate: 1, source: 'INR', rateDate: onDate };

    const key = `fx:${cur}:${onDate}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const captured = await this.fetchLive(cur, onDate);
    await this.redis.set(key, JSON.stringify(captured), 'EX', ExchangeRateService.TTL_SECONDS);
    return captured;
  }

  /** Live ECB reference rate for {currency}->INR on the given date (or nearest prior business day). */
  private async fetchLive(currency: string, onDate: string): Promise<CapturedRate> {
    const date = onDate.slice(0, 10);
    const url = `https://api.frankfurter.app/${date}?from=${currency}&to=INR`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: any = await res.json();
      const rate = data?.rates?.INR;
      if (typeof rate !== 'number' || rate <= 0) throw new Error('No INR rate in response');
      return { rate, source: `ECB reference (frankfurter.app), ${data.date ?? date}`, rateDate: data.date ?? date };
    } catch (err: any) {
      this.logger.warn(`Live FX lookup failed for ${currency} on ${date} (${err.message}); using fallback rate.`);
      return { rate: FALLBACK[currency] ?? 83.0, source: 'Fallback (live source unavailable — confirm rate)', rateDate: date };
    }
  }
}
