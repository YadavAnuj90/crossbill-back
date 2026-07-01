import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Queue } from 'bullmq';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { InvoiceNumberService } from './services/invoice-number.service';
import { ExchangeRateService } from './services/exchange-rate.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ClientsService } from '../clients/clients.service';
import { UsersService } from '../users/users.service';
import { PaginationDto, Paginated } from '../../common/dto/pagination.dto';
import { financialYearOf, femaDueDate } from '../../common/constants/financial-year';
import { renderDeclaration, PLACE_OF_SUPPLY_EXPORT } from '../../common/constants/compliance';
import { DEFAULT_SAC } from '../../common/constants/sac-codes';
import { agingOf, FemaAging } from '../../common/constants/fema';
import { computeGst, DEFAULT_GST_RATE, DOMESTIC_TAX_NOTE } from '../../common/constants/gst';
import { stateCodeFromGstin, stateName } from '../../common/constants/india-states';
import { QUEUES, JOBS } from '../../queue/queue.constants';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(Invoice.name) private readonly invoices: Model<InvoiceDocument>,
    private readonly numbering: InvoiceNumberService,
    private readonly fx: ExchangeRateService,
    private readonly clients: ClientsService,
    private readonly users: UsersService,
    @InjectQueue(QUEUES.PDF) private readonly pdfQueue: Queue,
  ) {}

  async create(orgId: string, userId: string, dto: CreateInvoiceDto) {
    const client = await this.clients.findOneScoped(orgId, dto.clientId);
    const profile = await this.users.findById(userId);

    const invoiceDate = dto.invoiceDate ?? new Date().toISOString().slice(0, 10);
    const dateObj = new Date(invoiceDate + 'T00:00:00Z');
    const fy = financialYearOf(dateObj);
    const defaultSac = profile?.defaultSac ?? DEFAULT_SAC;

    // Line totals in minor units (avoid float drift).
    const items = dto.items.map((i) => {
      const lineTotalCents = Math.round(i.quantity * i.unitAmount * 100);
      return {
        description: i.description,
        sacCode: i.sacCode ?? defaultSac,
        quantity: i.quantity.toFixed(2),
        unitAmount: i.unitAmount.toFixed(2),
        lineTotal: (lineTotalCents / 100).toFixed(2),
        gstRate: i.gstRate ?? 0,
        _cents: lineTotalCents,
      };
    });
    const subtotalCents = items.reduce((acc, i) => acc + i._cents, 0);

    const base = client.type === 'domestic'
      ? this.buildDomestic(client, profile, items, subtotalCents, dto)
      : await this.buildExport(profile, items, subtotalCents, invoiceDate, dateObj, dto);

    const number = await this.numbering.allocate(orgId, fy);

    const saved = await this.invoices.create({
      orgId,
      clientId: dto.clientId,
      number,
      financialYear: fy,
      invoiceDate,
      items: items.map(({ _cents, ...rest }) => rest),
      ...base,
    });

    await this.pdfQueue.add(JOBS.GENERATE_PDF, { invoiceId: saved.id, orgId }, { jobId: `pdf-${saved.id}` });
    return saved.toJSON();
  }

  // ── Export (foreign client, zero-rated under LUT) ──
  private async buildExport(
    profile: any, items: any[], subtotalCents: number, invoiceDate: string, dateObj: Date, dto: CreateInvoiceDto,
  ) {
    const currency = (dto.currency && dto.currency !== 'INR' ? dto.currency : 'USD').toUpperCase();
    const captured = await this.fx.capture(currency, invoiceDate);
    const onLut = Boolean(profile?.lutNumber);
    const inrCents = Math.round((subtotalCents / 100) * captured.rate * 100);
    return {
      type: 'export' as const,
      currency,
      fxRate: captured.rate.toFixed(6),
      fxRateSource: captured.source,
      fxRateDate: captured.rateDate,
      subtotal: (subtotalCents / 100).toFixed(2),
      inrEquivalent: (inrCents / 100).toFixed(2),
      taxType: 'LUT_ZERO' as const,
      cgstAmount: '0.00', sgstAmount: '0.00', igstAmount: '0.00', taxTotal: '0.00',
      grandTotal: (subtotalCents / 100).toFixed(2),
      declarationText: renderDeclaration({ onLut, lutArn: profile?.lutArn, lutFy: profile?.lutFy }),
      placeOfSupply: PLACE_OF_SUPPLY_EXPORT,
      placeOfSupplyState: null,
      femaDueDate: femaDueDate(dateObj).toISOString().slice(0, 10),
    };
  }

  // ── Domestic (Indian client, GST: CGST+SGST or IGST) ──
  private buildDomestic(client: any, profile: any, items: any[], subtotalCents: number, _dto: CreateInvoiceDto) {
    const supplierState = stateCodeFromGstin(profile?.gstin);
    if (!supplierState) {
      throw new BadRequestException('Add your GSTIN in Business profile before raising a domestic GST invoice.');
    }
    if (!client.stateCode) {
      throw new BadRequestException('This domestic client is missing a GST state — edit the client to add it.');
    }
    const gst = computeGst(
      subtotalCents,
      items.map((i) => ({ lineTotalCents: i._cents, gstRate: i.gstRate ?? DEFAULT_GST_RATE })),
      supplierState,
      client.stateCode,
    );
    return {
      type: 'domestic' as const,
      currency: 'INR',
      fxRate: '1.000000', fxRateSource: 'NA', fxRateDate: new Date().toISOString().slice(0, 10),
      subtotal: (subtotalCents / 100).toFixed(2),
      inrEquivalent: (gst.grandTotalCents / 100).toFixed(2),
      taxType: gst.taxType,
      cgstAmount: (gst.cgstCents / 100).toFixed(2),
      sgstAmount: (gst.sgstCents / 100).toFixed(2),
      igstAmount: (gst.igstCents / 100).toFixed(2),
      taxTotal: (gst.taxTotalCents / 100).toFixed(2),
      grandTotal: (gst.grandTotalCents / 100).toFixed(2),
      declarationText: DOMESTIC_TAX_NOTE,
      placeOfSupply: stateName(client.stateCode),
      placeOfSupplyState: client.stateCode,
      femaDueDate: null,
    };
  }

  async list(orgId: string, page: PaginationDto): Promise<Paginated<any>> {
    const [items, total] = await Promise.all([
      this.invoices.find({ orgId }).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).exec(),
      this.invoices.countDocuments({ orgId }).exec(),
    ]);
    return {
      items: items.map((i) => i.toJSON()),
      meta: { page: page.page, limit: page.limit, total, totalPages: Math.ceil(total / page.limit) },
    };
  }

  async findOneScoped(orgId: string, id: string): Promise<InvoiceDocument> {
    const invoice = await this.invoices.findOne({ _id: id, orgId }).exec();
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(orgId: string, id: string, dto: UpdateInvoiceDto) {
    const current = await this.invoices.findOne({ _id: id, orgId }).exec();
    if (!current) throw new NotFoundException('Invoice not found');

    const patch: any = {};
    if (dto.status && dto.status !== current.status) {
      // A settled (paid) invoice is immutable. Transitioning TO paid is allowed —
      // domestic invoices are marked paid directly; exports are settled via remittances.
      if (current.status === 'paid') {
        throw new BadRequestException('A paid invoice is settled and can no longer be changed.');
      }
      patch.status = dto.status;
    }

    if (Object.keys(patch).length === 0) return current.toJSON();
    const invoice = await this.invoices.findOneAndUpdate({ _id: id, orgId }, patch, { new: true }).exec();
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice.toJSON();
  }

  async setPdfUrl(id: string, pdfUrl: string): Promise<void> {
    await this.invoices.findByIdAndUpdate(id, { pdfUrl }).exec();
  }

  // ───────────────────────── FEMA aging (exports only) ─────────────────────────

  async femaAging(orgId: string): Promise<Array<Record<string, any>>> {
    const rows = await this.invoices
      .find({ orgId, type: 'export', status: { $ne: 'paid' } })
      .sort({ femaDueDate: 1 })
      .exec();
    return rows
      .filter((inv) => inv.femaDueDate)
      .map((inv) => {
        const aging: FemaAging = agingOf(inv.invoiceDate, inv.femaDueDate as string);
        return { ...inv.toJSON(), aging };
      });
  }

  findAllUnpaid() {
    return this.invoices.find({ type: 'export', status: { $ne: 'paid' }, femaDueDate: { $ne: null } }).exec();
  }

  /** All invoices for an org in a financial year (used by the document bundle / filing exports). */
  listByFinancialYear(orgId: string, financialYear: string) {
    return this.invoices.find({ orgId, financialYear }).sort({ number: 1 }).exec();
  }

  async markPaid(orgId: string, id: string) {
    await this.invoices.updateOne({ _id: id, orgId }, { status: 'paid' }).exec();
  }

  async markOverdue(id: string) {
    await this.invoices.updateOne({ _id: id, status: { $ne: 'paid' } }, { status: 'overdue' }).exec();
  }

  async pushReminderSent(id: string, key: string) {
    await this.invoices.updateOne({ _id: id }, { $addToSet: { femaRemindersSent: key } }).exec();
  }
}
