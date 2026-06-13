import { Injectable, NotFoundException } from '@nestjs/common';
import { PdfServiceClient } from './clients/pdf-service.client';
import { GstrExportDto } from './dto/gstr-export.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { ClientsService } from '../clients/clients.service';
import { UsersService } from '../users/users.service';
import { RemittancesService } from '../remittances/remittances.service';
import { AuditService } from '../audit/audit.service';

/**
 * Filing exports (design §5, §12). GSTR-1 6A is delegated to the Python service; the document
 * bundle is orchestrated here (gather invoices + FIRC + LUT) and zipped by the Python service.
 * Compliance formats must be CA-signed before production.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly pdfClient: PdfServiceClient,
    private readonly invoices: InvoicesService,
    private readonly clients: ClientsService,
    private readonly users: UsersService,
    private readonly remittances: RemittancesService,
    private readonly audit: AuditService,
  ) {}

  async gstr6a(orgId: string, dto: GstrExportDto): Promise<{ url: string }> {
    return this.pdfClient.generateGstr({ orgId, financialYear: dto.financialYear });
  }

  /**
   * Builds a ZIP bundle for a financial year: every invoice PDF, the captured FIRC/e-FIRA files,
   * a CSV manifest, and an LUT reference — ready to hand to a CA (design §5).
   */
  async buildBundle(orgId: string, userId: string, financialYear: string): Promise<{ buffer: Buffer; filename: string }> {
    const invoices = await this.invoices.listByFinancialYear(orgId, financialYear);
    if (invoices.length === 0) {
      throw new NotFoundException(`No invoices found for FY ${financialYear}`);
    }

    const profile = await this.users.findById(userId);
    const clients = await this.clients.findAllForOrg(orgId);
    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const numberById = new Map(invoices.map((i) => [i.id, i.number]));
    const firc = await this.remittances.collectFircForInvoices(orgId, invoices.map((i) => i.id));

    const seller = {
      legalName: profile?.legalName ?? null,
      gstin: profile?.gstin ?? null,
      address: profile?.address ?? null,
      lutNumber: profile?.lutNumber ?? null,
      lutFy: profile?.lutFy ?? null,
      lutArn: profile?.lutArn ?? null,
      bankAccount: profile?.bankAccount ?? null,
      bankIfsc: profile?.bankIfsc ?? null,
    };

    const payload = {
      financialYear,
      seller,
      invoices: invoices.map((inv) => {
        const c = clientMap.get(inv.clientId);
        return {
          invoiceId: inv.id,
          type: inv.type,
          number: inv.number,
          invoiceDate: inv.invoiceDate,
          currency: inv.currency,
          fxRate: inv.fxRate,
          fxRateSource: inv.fxRateSource,
          fxRateDate: inv.fxRateDate,
          subtotal: inv.subtotal,
          inrEquivalent: inv.inrEquivalent,
          taxType: inv.taxType,
          cgstAmount: inv.cgstAmount,
          sgstAmount: inv.sgstAmount,
          igstAmount: inv.igstAmount,
          taxTotal: inv.taxTotal,
          grandTotal: inv.grandTotal,
          declarationText: inv.declarationText,
          placeOfSupply: inv.placeOfSupply,
          status: inv.status,
          femaDueDate: inv.femaDueDate,
          seller: { legalName: seller.legalName, gstin: seller.gstin },
          client: c
            ? { name: c.name, address: c.address, country: c.country, gstin: c.gstin, stateCode: c.stateCode, type: c.type }
            : {},
          items: (inv.items ?? []).map((it) => ({
            description: it.description, sacCode: it.sacCode, quantity: it.quantity,
            unitAmount: it.unitAmount, lineTotal: it.lineTotal, gstRate: it.gstRate,
          })),
        };
      }),
      firc: firc.map((f) => ({
        invoiceNumber: numberById.get(f.invoiceId) ?? 'invoice',
        filename: f.filename,
        base64: f.buffer.toString('base64'),
      })),
    };

    const buffer = await this.pdfClient.generateBundle(payload);
    await this.audit.log({
      action: 'bundle.generated', orgId, resourceId: financialYear,
      meta: { invoices: invoices.length, firc: firc.length },
    });
    return { buffer, filename: `crossbill-bundle-${financialYear}.zip` };
  }
}
