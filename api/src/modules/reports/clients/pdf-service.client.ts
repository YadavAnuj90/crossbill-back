import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface InvoicePdfRequest {
  invoiceId: string;
  number: string;
  invoiceDate: string;
  currency: string;
  fxRate: string;
  inrEquivalent: string;
  declarationText: string;
  placeOfSupply: string;
  seller: Record<string, unknown>;
  client: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
}

/**
 * Server-to-server HTTP client to the Python pdf-service (design §6, §9).
 * Authenticated with the rotating internal service token — NOT end-user OAuth.
 */
@Injectable()
export class PdfServiceClient {
  private readonly logger = new Logger(PdfServiceClient.name);
  private readonly http: AxiosInstance;

  constructor(config: ConfigService) {
    this.http = axios.create({
      baseURL: config.get<string>('pdfService.url'),
      timeout: 30_000,
      headers: { 'x-internal-token': config.get<string>('pdfService.internalToken') ?? '' },
    });
  }

  async generateInvoice(payload: InvoicePdfRequest): Promise<{ url: string }> {
    try {
      const { data } = await this.http.post('/generate/invoice', payload);
      return data;
    } catch (err: any) {
      this.logger.error(`pdf-service invoice generation failed: ${err.message}`);
      throw new HttpException('PDF generation failed', 502);
    }
  }

  async generateGstr(payload: Record<string, unknown>): Promise<{ url: string }> {
    const { data } = await this.http.post('/generate/gstr', payload);
    return data;
  }
}
