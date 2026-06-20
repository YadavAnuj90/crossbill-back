import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';

export interface CreatePaymentLinkInput {
  amountPaise: number;          // smallest currency unit (INR paise)
  currency?: string;            // defaults to INR
  description: string;
  referenceId: string;          // our invoice/billing id — must be unique per link
  customer?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  callbackUrl?: string;
}

export interface RazorpayPaymentLink {
  id: string;
  short_url: string;
  status: string;
  amount: number;
  currency: string;
  reference_id?: string;
}

/**
 * Thin REST client for Razorpay (Payments + Billing). Uses HTTP Basic auth
 * (key_id:key_secret) so no SDK dependency is required. Webhook signatures are
 * verified with HMAC-SHA256 over the raw request body (Razorpay spec).
 */
@Injectable()
export class RazorpayClient {
  private readonly logger = new Logger(RazorpayClient.name);
  private readonly http: AxiosInstance;
  private readonly configured: boolean;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    const keyId = config.get<string>('razorpay.keyId') ?? '';
    const keySecret = config.get<string>('razorpay.keySecret') ?? '';
    this.webhookSecret = config.get<string>('razorpay.webhookSecret') ?? '';
    this.configured = Boolean(keyId && keySecret);
    this.http = axios.create({
      baseURL: 'https://api.razorpay.com/v1',
      timeout: 20_000,
      auth: { username: keyId, password: keySecret },
    });
  }

  isConfigured(): boolean {
    return this.configured;
  }

  hasWebhookSecret(): boolean {
    return Boolean(this.webhookSecret);
  }

  async createPaymentLink(input: CreatePaymentLinkInput): Promise<RazorpayPaymentLink> {
    if (!this.configured) {
      throw new HttpException('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the API .env.', 503);
    }
    try {
      const { data } = await this.http.post('/payment_links', {
        amount: input.amountPaise,
        currency: input.currency ?? 'INR',
        accept_partial: false,
        description: input.description.slice(0, 2048),
        reference_id: input.referenceId,
        customer: input.customer,
        notify: { sms: false, email: Boolean(input.customer?.email) },
        reminder_enable: true,
        notes: input.notes,
        callback_url: input.callbackUrl,
        callback_method: input.callbackUrl ? 'get' : undefined,
      });
      return data as RazorpayPaymentLink;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.description || err.message;
      this.logger.error(`Razorpay createPaymentLink failed: ${msg}`);
      throw new HttpException(`Razorpay error: ${msg}`, 502);
    }
  }

  /** Verifies the X-Razorpay-Signature header against the raw body. */
  verifyWebhook(rawBody: Buffer | string, signature: string | undefined): boolean {
    if (!this.webhookSecret || !signature) return false;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
      .digest('hex');
    try {
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(signature, 'utf8');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
