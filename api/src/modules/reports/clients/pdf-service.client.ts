import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface InvoicePdfRequest {
  invoiceId: string;
  type: string;                 // 'export' | 'domestic'
  docType?: string;             // undefined => tax invoice; 'credit_note' | 'debit_note'
  originalNumber?: string;      // invoice the note is raised against
  reason?: string;              // §34 reason for the note
  number: string;
  invoiceDate: string;
  currency: string;
  fxRate: string;
  fxRateSource?: string;
  fxRateDate?: string;
  inrEquivalent: string;
  subtotal: string;
  taxType: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  taxTotal: string;
  grandTotal: string;
  declarationText: string;
  placeOfSupply: string;
  seller: Record<string, unknown>;
  client: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
}

export interface AgreementPdfRequest {
  title: string;
  category: string;
  body: string;
  sellerName?: string | null;
  clientName?: string | null;
  signerName?: string | null;
  signerEmail?: string | null;
  signedAt?: string;
  signerIp?: string;
  otpVerified?: boolean;
  signatureImage?: string;
  geo?: string | null;
  verifyCode?: string | null;
  auditTrail?: Array<{ at: string; event: string; detail: string | null }>;
  agreementId?: string;
}

export interface SalarySlipPdfRequest {
  company: { name: string; logoUrl?: string | null; address?: string | null };
  employeeName: string;
  empCode?: string | null;
  designation?: string | null;
  month: string;
  earnings: { basic: string; hra: string; bonus: string; allowances: string };
  deductions: { pf: string; esic: string; tds: string; other: string };
  gross: string;
  totalDeductions: string;
  net: string;
  slipId?: string;
  generatedAt?: string;
}

export interface LetterPdfRequest {
  kind: string; // offer | experience | relieving
  company: { name: string; logoUrl?: string | null; address?: string | null };
  employeeName: string;
  designation?: string | null;
  department?: string | null;
  joiningDate?: string | null;
  ctc?: string | null;
  reportingManager?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  signatory?: string | null;
  letterId?: string;
  issuedAt?: string;
}

/** Server-to-server client to the Python pdf-service (design §6, §9), internal-token auth. */
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

  async generateAgreement(payload: AgreementPdfRequest): Promise<{ url: string }> {
    try {
      const { data } = await this.http.post('/generate/agreement', payload);
      return data;
    } catch (err: any) {
      this.logger.error(`pdf-service agreement generation failed: ${err.message}`);
      throw new HttpException('Agreement PDF generation failed', 502);
    }
  }

  async generateLetter(payload: LetterPdfRequest): Promise<{ url: string }> {
    try {
      const { data } = await this.http.post('/generate/letter', payload);
      return data;
    } catch (err: any) {
      this.logger.error(`pdf-service letter generation failed: ${err.message}`);
      throw new HttpException('Letter PDF generation failed', 502);
    }
  }

  async generateSalarySlip(payload: SalarySlipPdfRequest): Promise<{ url: string }> {
    try {
      const { data } = await this.http.post('/generate/salary-slip', payload);
      return data;
    } catch (err: any) {
      this.logger.error(`pdf-service salary slip generation failed: ${err.message}`);
      throw new HttpException('Salary slip PDF generation failed', 502);
    }
  }

  async generateGstr(payload: Record<string, unknown>): Promise<{ url: string }> {
    const { data } = await this.http.post('/generate/gstr', payload);
    return data;
  }

  /** Builds the document-bundle ZIP in the Python service and returns the raw bytes. */
  async generateBundle(payload: Record<string, unknown>): Promise<Buffer> {
    try {
      const { data } = await this.http.post('/generate/bundle', payload, { responseType: 'arraybuffer' });
      return Buffer.from(data);
    } catch (err: any) {
      this.logger.error(`pdf-service bundle generation failed: ${err.message}`);
      throw new HttpException('Document bundle generation failed', 502);
    }
  }
}
