import { Injectable, NotFoundException } from '@nestjs/common';
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
import { QUEUES, JOBS } from '../../queue/queue.constants';

/**
 * Core loop (design §7): validate -> allocate next gapless FY number (atomic counter) ->
 * capture FX rate -> auto-fill compliance fields -> persist invoice -> enqueue generate-pdf.
 */
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
    // Ownership check: client must belong to the caller's org (design §10).
    await this.clients.findOneScoped(orgId, dto.clientId);
    const profile = await this.users.findById(userId);

    const invoiceDate = dto.invoiceDate ?? new Date().toISOString().slice(0, 10);
    const dateObj = new Date(invoiceDate + 'T00:00:00Z');
    const fy = financialYearOf(dateObj);

    // Capture the FX rate immutably (design §12).
    const captured = await this.fx.capture(dto.currency, invoiceDate);

    // Compliance auto-fill (design §12).
    const onLut = Boolean(profile?.lutNumber);
    const declaration = renderDeclaration({
      onLut, lutArn: profile?.lutArn ?? undefined, lutFy: profile?.lutFy ?? undefined,
    });
    const defaultSac = profile?.defaultSac ?? DEFAULT_SAC;

    // Compute money in minor units to avoid float drift, store as fixed-2 strings.
    const items = dto.items.map((i) => {
      const lineTotalCents = Math.round(i.quantity * i.unitAmount * 100);
      return {
        description: i.description,
        sacCode: i.sacCode ?? defaultSac,
        quantity: i.quantity.toFixed(2),
        unitAmount: i.unitAmount.toFixed(2),
        lineTotal: (lineTotalCents / 100).toFixed(2),
        _cents: lineTotalCents,
      };
    });
    const subtotalCents = items.reduce((acc, i) => acc + i._cents, 0);
    const inrCents = Math.round((subtotalCents / 100) * captured.rate * 100);

    // Allocate the gapless number (atomic) then insert the invoice document.
    const number = await this.numbering.allocate(orgId, fy);

    const saved = await this.invoices.create({
      orgId,
      clientId: dto.clientId,
      number,
      financialYear: fy,
      invoiceDate,
      currency: dto.currency.toUpperCase(),
      fxRate: captured.rate.toFixed(6),
      fxRateSource: captured.source,
      fxRateDate: captured.rateDate,
      subtotal: (subtotalCents / 100).toFixed(2),
      inrEquivalent: (inrCents / 100).toFixed(2),
      declarationText: declaration,
      placeOfSupply: PLACE_OF_SUPPLY_EXPORT,
      status: 'draft',
      femaDueDate: femaDueDate(dateObj).toISOString().slice(0, 10),
      items: items.map(({ _cents, ...rest }) => rest),
    });

    // Enqueue PDF generation (design §13). Idempotent on invoice id.
    await this.pdfQueue.add(
      JOBS.GENERATE_PDF,
      { invoiceId: saved.id, orgId },
      { jobId: `pdf:${saved.id}` },
    );

    return saved.toJSON();
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
    const patch: any = {};
    if (dto.status) patch.status = dto.status;
    const invoice = await this.invoices.findOneAndUpdate({ _id: id, orgId }, patch, { new: true }).exec();
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice.toJSON();
  }

  async setPdfUrl(id: string, pdfUrl: string): Promise<void> {
    await this.invoices.findByIdAndUpdate(id, { pdfUrl }).exec();
  }
}
