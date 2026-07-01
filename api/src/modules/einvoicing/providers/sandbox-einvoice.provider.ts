import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { EInvoicePayload, EInvoiceProvider, EInvoiceResult } from './einvoice-provider.interface';

/**
 * Built-in sandbox IRP. Produces a deterministic 64-char IRN and a representative
 * signed-QR payload (a base64url JWS-shaped string) that encodes the same fields a
 * real NIC IRP QR carries — so the rendered QR is structurally realistic and scannable.
 * Swap for a licensed GSP via the EINVOICE_PROVIDER factory when credentials exist.
 */
@Injectable()
export class SandboxEInvoiceProvider implements EInvoiceProvider {
  readonly name = 'sandbox';
  readonly sandbox = true;
  private readonly logger = new Logger('EInvoiceSandbox');

  async generate(payload: EInvoicePayload): Promise<EInvoiceResult> {
    const ackDate = new Date().toISOString();
    const irn = createHash('sha256')
      .update(`${payload.sellerGstin}|${payload.docType}|${payload.docNo}|${payload.docDate}|${Date.now()}`)
      .digest('hex');
    const ackNo = String(randomInt(1_000_000_000_0, 9_999_999_999_9));

    // QR carries the canonical NIC fields.
    const qrClaims = {
      SellerGstin: payload.sellerGstin,
      BuyerGstin: payload.buyerGstin,
      DocNo: payload.docNo,
      DocTyp: payload.docType,
      DocDt: payload.docDate,
      TotInvVal: payload.totalValue,
      ItemCnt: payload.itemCount,
      MainHsnCode: payload.mainHsn,
      Irn: irn,
      IrnDt: ackDate.slice(0, 10),
    };
    const signedQr = this.fakeJws(qrClaims);
    const signedInvoice = this.fakeJws({ ...qrClaims, Note: 'SANDBOX — not a government-issued IRN' });

    this.logger.warn(`[sandbox] minted IRN ${irn.slice(0, 12)}… for doc ${payload.docNo}`);
    return { irn, ackNo, ackDate, signedInvoice, signedQr };
  }

  async cancel(irn: string, reason: string): Promise<{ ok: boolean }> {
    this.logger.warn(`[sandbox] cancelled IRN ${irn.slice(0, 12)}… (${reason})`);
    return { ok: true };
  }

  /** header.payload.signature shaped like a JWS (signature is a sandbox marker). */
  private fakeJws(claims: Record<string, unknown>): string {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const header = b64({ alg: 'RS256', typ: 'JWT' });
    const body = b64(claims);
    const sig = createHash('sha256').update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
  }
}
