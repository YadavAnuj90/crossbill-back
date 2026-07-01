import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EInvoice, EInvoiceDocument } from './schemas/einvoice.schema';
import { EINVOICE_PROVIDER, EInvoiceProvider, EInvoicePayload } from './providers/einvoice-provider.interface';
import { InvoicesService } from '../invoices/invoices.service';
import { ClientsService } from '../clients/clients.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { PaginationDto, Paginated } from '../../common/dto/pagination.dto';

const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000; // NIC: cancel within 24h

/** Render a scannable QR PNG data URL. The `qrcode` package is loaded defensively so a
 *  missing install never breaks boot — the e-invoice still works, just without the image. */
async function renderQr(text: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const QR = require('qrcode');
    return await QR.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, width: 240 });
  } catch {
    return null;
  }
}

@Injectable()
export class EInvoicingService {
  constructor(
    @InjectModel(EInvoice.name) private readonly einvoices: Model<EInvoiceDocument>,
    @Inject(EINVOICE_PROVIDER) private readonly provider: EInvoiceProvider,
    private readonly invoices: InvoicesService,
    private readonly clients: ClientsService,
    private readonly orgs: OrganizationsService,
    private readonly audit: AuditService,
  ) {}

  /** Provider/connection info for the UI. */
  status() {
    return { provider: this.provider.name, sandbox: this.provider.sandbox };
  }

  async get(orgId: string, invoiceId: string) {
    const doc = await this.einvoices.findOne({ orgId, invoiceId }).exec();
    return doc ? doc.toJSON() : null;
  }

  async list(orgId: string, page: PaginationDto): Promise<Paginated<any>> {
    const [items, total] = await Promise.all([
      this.einvoices.find({ orgId }).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).exec(),
      this.einvoices.countDocuments({ orgId }).exec(),
    ]);
    return {
      items: items.map((d) => d.toJSON()),
      meta: { page: page.page, limit: page.limit, total, totalPages: Math.ceil(total / page.limit) },
    };
  }

  async generate(orgId: string, invoiceId: string, userId?: string) {
    const inv = await this.invoices.findOneScoped(orgId, invoiceId);

    const existing = await this.einvoices.findOne({ orgId, invoiceId }).exec();
    if (existing && existing.status === 'generated') {
      throw new ConflictException('An e-invoice (IRN) has already been generated for this invoice.');
    }

    // Eligibility: export, or domestic to a GST-registered (B2B) buyer. Not B2C.
    const client = await this.clients.findOneScoped(orgId, inv.clientId);
    const isExport = inv.type === 'export';
    const isDomesticB2B = inv.type === 'domestic' && (client as any).customerType === 'b2b' && !!(client as any).gstin;
    if (!isExport && !isDomesticB2B) {
      throw new BadRequestException('E-invoicing applies to export and domestic B2B (GST-registered) invoices only.');
    }

    const org = await this.orgs.findById(orgId).catch(() => null);
    const sellerGstin = (org as any)?.gstin || 'URP';
    const buyerGstin = isExport ? 'URP' : ((client as any).gstin || 'URP');
    const totalValue = inv.grandTotal && inv.grandTotal !== '0.00' ? inv.grandTotal : inv.subtotal;

    const payload: EInvoicePayload = {
      docNo: inv.number,
      docDate: inv.invoiceDate.slice(0, 10),
      docType: 'INV',
      supplyType: isExport ? (inv.taxType === 'IGST' ? 'EXPWP' : 'EXPWOP') : 'B2B',
      sellerGstin,
      buyerGstin,
      totalValue,
      itemCount: inv.items?.length ?? 0,
      mainHsn: inv.items?.[0]?.sacCode ?? '',
      currency: inv.currency,
    };

    let result;
    try {
      result = await this.provider.generate(payload);
    } catch (err: any) {
      throw new BadRequestException(`IRP registration failed: ${err?.message ?? 'unknown error'}`);
    }

    const qrImage = await renderQr(result.signedQr);
    const now = new Date().toISOString();

    const doc = await this.einvoices.findOneAndUpdate(
      { orgId, invoiceId },
      {
        orgId,
        invoiceId,
        invoiceNumber: inv.number,
        invoiceDate: inv.invoiceDate.slice(0, 10),
        totalValue,
        currency: inv.currency,
        irn: result.irn,
        ackNo: result.ackNo,
        ackDate: result.ackDate,
        signedInvoice: result.signedInvoice,
        signedQr: result.signedQr,
        qrImage,
        status: 'generated',
        provider: this.provider.name,
        sandbox: this.provider.sandbox,
        generatedAt: now,
        cancelledAt: null,
        cancelReason: null,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();

    await this.audit.log({
      action: 'einvoice.generated', orgId, userId, resourceId: invoiceId,
      meta: { irn: result.irn, number: inv.number, sandbox: this.provider.sandbox },
    });
    return doc!.toJSON();
  }

  async cancel(orgId: string, invoiceId: string, reason: string, userId?: string) {
    const doc = await this.einvoices.findOne({ orgId, invoiceId }).exec();
    if (!doc || doc.status !== 'generated') {
      throw new NotFoundException('No active e-invoice to cancel for this invoice.');
    }
    const age = Date.now() - new Date(doc.generatedAt ?? doc.get('createdAt')).getTime();
    if (age > CANCEL_WINDOW_MS) {
      throw new BadRequestException('An IRN can only be cancelled within 24 hours of generation.');
    }

    try {
      await this.provider.cancel(doc.irn, reason);
    } catch (err: any) {
      throw new BadRequestException(`IRP cancellation failed: ${err?.message ?? 'unknown error'}`);
    }

    doc.status = 'cancelled';
    doc.cancelledAt = new Date().toISOString();
    doc.cancelReason = reason;
    await doc.save();

    await this.audit.log({
      action: 'einvoice.cancelled', orgId, userId, resourceId: invoiceId,
      meta: { irn: doc.irn, reason },
    });
    return doc.toJSON();
  }
}
