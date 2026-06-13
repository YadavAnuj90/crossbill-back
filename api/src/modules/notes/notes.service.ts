import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { ClientsService } from '../clients/clients.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { InvoiceNumberService } from '../invoices/services/invoice-number.service';
import { PdfServiceClient } from '../reports/clients/pdf-service.client';
import { PaginationDto, Paginated } from '../../common/dto/pagination.dto';
import { financialYearOf } from '../../common/constants/financial-year';
import { computeGst, DEFAULT_GST_RATE } from '../../common/constants/gst';
import { stateCodeFromGstin } from '../../common/constants/india-states';

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    @InjectModel(Note.name) private readonly notes: Model<NoteDocument>,
    private readonly invoices: InvoicesService,
    private readonly clients: ClientsService,
    private readonly users: UsersService,
    private readonly numbering: InvoiceNumberService,
    private readonly pdfClient: PdfServiceClient,
    private readonly audit: AuditService,
  ) {}

  /** Create a credit/debit note against an invoice (GST §34). Tax mirrors the invoice type. */
  async create(orgId: string, userId: string, dto: CreateNoteDto) {
    const invoice = await this.invoices.findOneScoped(orgId, dto.invoiceId);
    const profile = await this.users.findById(userId);
    const client = await this.clients.findOneScoped(orgId, invoice.clientId);

    const noteDate = new Date().toISOString().slice(0, 10);
    const fy = financialYearOf(new Date(noteDate + 'T00:00:00Z'));

    const items = dto.items.map((i) => {
      const cents = Math.round(i.quantity * i.unitAmount * 100);
      return {
        description: i.description,
        sacCode: i.sacCode ?? profile?.defaultSac ?? '998314',
        quantity: i.quantity.toFixed(2),
        unitAmount: i.unitAmount.toFixed(2),
        lineTotal: (cents / 100).toFixed(2),
        gstRate: i.gstRate ?? 0,
        _cents: cents,
      };
    });
    const subtotalCents = items.reduce((a, i) => a + i._cents, 0);

    let tax = { taxType: 'LUT_ZERO' as const, cgst: '0.00', sgst: '0.00', igst: '0.00', taxTotal: '0.00', grand: (subtotalCents / 100).toFixed(2) };
    if (invoice.type === 'domestic') {
      const supplierState = stateCodeFromGstin(profile?.gstin);
      const r = computeGst(
        subtotalCents,
        items.map((i) => ({ lineTotalCents: i._cents, gstRate: i.gstRate ?? DEFAULT_GST_RATE })),
        supplierState ?? client.stateCode ?? '',
        client.stateCode ?? '',
      );
      tax = {
        taxType: r.taxType as any,
        cgst: (r.cgstCents / 100).toFixed(2),
        sgst: (r.sgstCents / 100).toFixed(2),
        igst: (r.igstCents / 100).toFixed(2),
        taxTotal: (r.taxTotalCents / 100).toFixed(2),
        grand: (r.grandTotalCents / 100).toFixed(2),
      };
    }

    const prefix = dto.kind === 'credit' ? 'CN' : 'DN';
    const number = await this.numbering.allocateSeries(orgId, fy, prefix);

    const note = await this.notes.create({
      orgId,
      kind: dto.kind,
      number,
      financialYear: fy,
      noteDate,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      invoiceDate: invoice.invoiceDate,
      clientId: invoice.clientId,
      invoiceType: invoice.type,
      currency: invoice.currency,
      fxRate: invoice.fxRate,
      fxRateSource: invoice.fxRateSource,
      fxRateDate: invoice.fxRateDate,
      reason: dto.reason,
      subtotal: (subtotalCents / 100).toFixed(2),
      taxType: tax.taxType,
      cgstAmount: tax.cgst,
      sgstAmount: tax.sgst,
      igstAmount: tax.igst,
      taxTotal: tax.taxTotal,
      grandTotal: tax.grand,
      placeOfSupply: invoice.placeOfSupply,
      placeOfSupplyState: invoice.placeOfSupplyState,
      items: items.map(({ _cents, ...rest }) => rest),
    });

    // Render the PDF synchronously (best-effort — note is saved either way).
    try {
      const { url } = await this.pdfClient.generateInvoice({
        invoiceId: note.id,
        type: invoice.type,
        docType: dto.kind === 'credit' ? 'credit_note' : 'debit_note',
        originalNumber: invoice.number,
        reason: dto.reason,
        number: note.number,
        invoiceDate: note.noteDate,
        currency: note.currency,
        fxRate: note.fxRate,
        fxRateSource: note.fxRateSource,
        fxRateDate: note.fxRateDate,
        inrEquivalent: note.grandTotal,
        subtotal: note.subtotal,
        taxType: note.taxType,
        cgstAmount: note.cgstAmount,
        sgstAmount: note.sgstAmount,
        igstAmount: note.igstAmount,
        taxTotal: note.taxTotal,
        grandTotal: note.grandTotal,
        declarationText: `Reason: ${dto.reason}. Issued against invoice ${invoice.number} dated ${invoice.invoiceDate} (GST §34).`,
        placeOfSupply: note.placeOfSupply,
        seller: { legalName: profile?.legalName, gstin: profile?.gstin },
        client: { name: client.name, address: client.address, country: client.country, gstin: client.gstin, stateCode: client.stateCode, type: client.type },
        items: note.items.map((i) => ({ description: i.description, sacCode: i.sacCode, quantity: i.quantity, unitAmount: i.unitAmount, lineTotal: i.lineTotal, gstRate: i.gstRate })),
      });
      note.pdfUrl = url;
      await note.save();
    } catch (e: any) {
      this.logger.warn(`Note ${note.number} PDF generation deferred: ${e.message}`);
    }

    await this.audit.log({
      action: `note.${dto.kind}.created`, orgId, resourceId: note.id,
      meta: { number: note.number, invoiceId: invoice.id, grandTotal: note.grandTotal },
    });
    return note.toJSON();
  }

  async list(orgId: string, page: PaginationDto): Promise<Paginated<any>> {
    const [items, total] = await Promise.all([
      this.notes.find({ orgId }).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).exec(),
      this.notes.countDocuments({ orgId }).exec(),
    ]);
    return { items: items.map((n) => n.toJSON()), meta: { page: page.page, limit: page.limit, total, totalPages: Math.ceil(total / page.limit) } };
  }

  listForInvoice(orgId: string, invoiceId: string) {
    return this.notes.find({ orgId, invoiceId }).sort({ createdAt: -1 }).exec().then((r) => r.map((n) => n.toJSON()));
  }

  async findOneScoped(orgId: string, id: string): Promise<NoteDocument> {
    const note = await this.notes.findOne({ _id: id, orgId }).exec();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }
}
