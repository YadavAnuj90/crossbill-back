import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Remittance, RemittanceDocument } from './schemas/remittance.schema';
import { DocumentMeta } from '../audit/schemas/document-meta.schema';
import { CreateRemittanceDto } from './dto/create-remittance.dto';
import { FircStorageService } from './services/firc-storage.service';
import { InvoicesService } from '../invoices/invoices.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RemittancesService {
  constructor(
    @InjectModel(Remittance.name) private readonly remittances: Model<RemittanceDocument>,
    @InjectModel(DocumentMeta.name) private readonly documentMeta: Model<DocumentMeta>,
    private readonly storage: FircStorageService,
    private readonly invoices: InvoicesService,
    private readonly audit: AuditService,
  ) {}

  /** Record a payment against an invoice and mark the invoice paid (design §5, §8). */
  async create(orgId: string, dto: CreateRemittanceDto) {
    // Ownership: the invoice must belong to the caller's org.
    const invoice = await this.invoices.findOneScoped(orgId, dto.invoiceId);

    const remittance = await this.remittances.create({
      orgId,
      invoiceId: invoice.id,
      amountReceived: dto.amountReceived.toFixed(2),
      currency: dto.currency.toUpperCase(),
      receivedDate: dto.receivedDate.slice(0, 10),
      purposeCode: dto.purposeCode,
      notes: dto.notes ?? null,
    });

    await this.invoices.markPaid(orgId, invoice.id);
    await this.audit.log({
      action: 'remittance.recorded', orgId, resourceId: remittance.id,
      meta: { invoiceId: invoice.id, amount: remittance.amountReceived, currency: remittance.currency },
    });

    return remittance.toJSON();
  }

  listForInvoice(orgId: string, invoiceId: string) {
    return this.remittances.find({ orgId, invoiceId }).sort({ receivedDate: -1 }).exec()
      .then((rows) => rows.map((r) => r.toJSON()));
  }

  async findOneScoped(orgId: string, id: string): Promise<RemittanceDocument> {
    const r = await this.remittances.findOne({ _id: id, orgId }).exec();
    if (!r) throw new NotFoundException('Remittance not found');
    return r;
  }

  /** Store the FIRC/e-FIRA file, set the download URL, and record document metadata (design §8, §17). */
  async attachFirc(
    orgId: string,
    remittanceId: string,
    file: { originalname: string; buffer: Buffer; mimetype: string },
  ) {
    const remittance = await this.findOneScoped(orgId, remittanceId);

    // Replace any previous file.
    if (remittance.fircStorageKey) await this.storage.remove(remittance.fircStorageKey);

    const stored = await this.storage.save(orgId, remittanceId, file.originalname, file.buffer);
    remittance.fircStorageKey = stored.storageKey;
    remittance.fircFilename = file.originalname;
    remittance.fircDocUrl = `/api/v1/remittances/${remittanceId}/firc`;
    await remittance.save();

    await this.documentMeta.create({
      orgId,
      invoiceId: remittance.invoiceId,
      storageKey: stored.storageKey,
      contentType: file.mimetype,
      sizeBytes: stored.sizeBytes,
      checksumSha256: stored.checksumSha256,
      scanStatus: 'pending', // virus scan hook (design §17)
    });

    await this.audit.log({
      action: 'firc.uploaded', orgId, resourceId: remittanceId,
      meta: { invoiceId: remittance.invoiceId, filename: file.originalname, sizeBytes: stored.sizeBytes },
    });

    return remittance.toJSON();
  }

  async readFirc(orgId: string, remittanceId: string): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const remittance = await this.findOneScoped(orgId, remittanceId);
    if (!remittance.fircStorageKey) throw new NotFoundException('No FIRC uploaded for this remittance');
    const meta = await this.documentMeta.findOne({ storageKey: remittance.fircStorageKey }).exec();
    const buffer = await this.storage.read(remittance.fircStorageKey);
    return { buffer, filename: remittance.fircFilename ?? 'firc', contentType: meta?.contentType ?? 'application/octet-stream' };
  }

  /** Collect all stored FIRC/e-FIRA files for a set of invoices (used by the document bundle). */
  async collectFircForInvoices(
    orgId: string,
    invoiceIds: string[],
  ): Promise<Array<{ invoiceId: string; filename: string; buffer: Buffer }>> {
    const rows = await this.remittances
      .find({ orgId, invoiceId: { $in: invoiceIds }, fircStorageKey: { $ne: null } })
      .exec();
    const out: Array<{ invoiceId: string; filename: string; buffer: Buffer }> = [];
    for (const r of rows) {
      try {
        const buffer = await this.storage.read(r.fircStorageKey as string);
        out.push({ invoiceId: r.invoiceId, filename: r.fircFilename ?? 'firc', buffer });
      } catch {
        // Skip unreadable files; the bundle should still build.
      }
    }
    return out;
  }
}
