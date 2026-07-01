/** Minimal payload an IRP needs to register an invoice and mint an IRN. */
export interface EInvoicePayload {
  docNo: string;
  docDate: string;
  docType: 'INV' | 'CRN' | 'DBN';
  supplyType: 'B2B' | 'EXPWP' | 'EXPWOP';
  sellerGstin: string;
  buyerGstin: string;
  totalValue: string;
  itemCount: number;
  mainHsn: string;
  currency: string;
}

/** What an IRP returns on successful registration. */
export interface EInvoiceResult {
  irn: string;
  ackNo: string;
  ackDate: string;
  signedInvoice: string;
  signedQr: string;
}

/**
 * Pluggable GST IRP / GSP provider (mirrors the Aadhaar provider pattern).
 * The sandbox provider mints realistic-looking values; a licensed GSP is dropped
 * in via the EINVOICE_PROVIDER factory once credentials exist.
 */
export interface EInvoiceProvider {
  readonly name: string;
  readonly sandbox: boolean;
  generate(payload: EInvoicePayload): Promise<EInvoiceResult>;
  cancel(irn: string, reason: string): Promise<{ ok: boolean }>;
}

export const EINVOICE_PROVIDER = 'EINVOICE_PROVIDER';
