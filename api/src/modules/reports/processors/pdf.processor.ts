import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InvoicesService } from '../../invoices/invoices.service';
import { ClientsService } from '../../clients/clients.service';
import { UsersService } from '../../users/users.service';
import { AuditService } from '../../audit/audit.service';
import { PdfServiceClient } from '../clients/pdf-service.client';
import { QUEUES, JOBS } from '../../../queue/queue.constants';

/** BullMQ worker for generate-pdf (design §13). Idempotent on invoice id; retried with backoff. */
@Processor(QUEUES.PDF)
export class PdfProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfProcessor.name);

  constructor(
    private readonly invoices: InvoicesService,
    private readonly clients: ClientsService,
    private readonly users: UsersService,
    private readonly pdfClient: PdfServiceClient,
    private readonly audit: AuditService,
  ) { super(); }

  async process(job: Job<{ invoiceId: string; orgId: string }>): Promise<void> {
    if (job.name !== JOBS.GENERATE_PDF) return;
    const { invoiceId, orgId } = job.data;

    const invoice = await this.invoices.findOneScoped(orgId, invoiceId);
    const client = await this.clients.findOneScoped(orgId, invoice.clientId);

    const { url } = await this.pdfClient.generateInvoice({
      invoiceId: invoice.id,
      type: invoice.type,
      number: invoice.number,
      invoiceDate: invoice.invoiceDate,
      currency: invoice.currency,
      fxRate: invoice.fxRate,
      inrEquivalent: invoice.inrEquivalent,
      subtotal: invoice.subtotal,
      taxType: invoice.taxType,
      cgstAmount: invoice.cgstAmount,
      sgstAmount: invoice.sgstAmount,
      igstAmount: invoice.igstAmount,
      taxTotal: invoice.taxTotal,
      grandTotal: invoice.grandTotal,
      declarationText: invoice.declarationText,
      placeOfSupply: invoice.placeOfSupply,
      seller: { gstin: client.orgId ? undefined : undefined },
      client: {
        name: client.name, address: client.address,
        country: client.country, gstin: client.gstin, stateCode: client.stateCode, type: client.type,
      },
      items: invoice.items.map((i) => ({
        description: i.description, sacCode: i.sacCode,
        quantity: i.quantity, unitAmount: i.unitAmount, lineTotal: i.lineTotal, gstRate: i.gstRate,
      })),
    });

    await this.invoices.setPdfUrl(invoice.id, url);
    await this.audit.log({ action: 'invoice.pdf.generated', orgId, resourceId: invoice.id, meta: { url } });
    this.logger.log(`PDF ready for invoice ${invoice.number}`);
  }
}
