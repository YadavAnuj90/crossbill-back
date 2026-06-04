import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
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
 * Core loop (design §7): validate → assign next gapless FY number → capture FX rate →
 * auto-fill compliance fields → write invoice (one transaction) → enqueue generate-pdf.
 */
@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    private readonly dataSource: DataSource,
    private readonly numbering: InvoiceNumberService,
    private readonly fx: ExchangeRateService,
    private readonly clients: ClientsService,
    private readonly users: UsersService,
    @InjectQueue(QUEUES.PDF) private readonly pdfQueue: Queue,
  ) {}

  async create(orgId: string, userId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    // Ownership check: client must belong to the caller's org (design §10).
    await this.clients.findOneScoped(orgId, dto.clientId);
    const profile = await this.users.findById(userId);

    const invoiceDate = dto.invoiceDate ?? new Date().toISOString().slice(0, 10);
    const dateObj = new Date(invoiceDate + 'T00:00:00Z');
    const fy = financialYearOf(dateObj);

    // Capture the FX rate immutably (design §12).
    const captured = await this.fx.capture(dto.currency, invoiceDate);

    // Compliance auto-fill (design §12). User never has to know the rules exist.
    const onLut = Boolean(profile?.lutNumber);
    const declaration = renderDeclaration({
      onLut, lutArn: profile?.lutArn ?? undefined, lutFy: profile?.lutFy ?? undefined,
    });
    const defaultSac = profile?.defaultSac ?? DEFAULT_SAC;

    // Compute money in minor units to avoid float drift, then store as fixed-2 strings.
    const items = dto.items.map((i) => {
      const lineTotalCents = Math.round(i.quantity * i.unitAmount * 100);
      return { ...i, sacCode: i.sacCode ?? defaultSac, lineTotalCents };
    });
    const subtotalCents = items.reduce((acc, i) => acc + i.lineTotalCents, 0);
    const inrCents = Math.round((subtotalCents / 100) * captured.rate * 100);

    return this.dataSource.transaction(async (manager) => {
      const number = await this.numbering.allocate(manager, orgId, fy);

      const invoice = manager.create(Invoice, {
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
        items: items.map((i) =>
          manager.create(InvoiceItem, {
            description: i.description,
            sacCode: i.sacCode,
            quantity: i.quantity.toFixed(2),
            unitAmount: i.unitAmount.toFixed(2),
            lineTotal: (i.lineTotalCents / 100).toFixed(2),
          }),
        ),
      });

      const saved = await manager.save(invoice);

      // Enqueue PDF generation (design §13). Idempotent on invoice id.
      await this.pdfQueue.add(
        JOBS.GENERATE_PDF,
        { invoiceId: saved.id, orgId },
        { jobId: `pdf:${saved.id}` },
      );

      return saved;
    });
  }

  async list(orgId: string, page: PaginationDto): Promise<Paginated<Invoice>> {
    const [items, total] = await this.invoices.findAndCount({
      where: { orgId },
      order: { createdAt: 'DESC' },
      skip: page.skip,
      take: page.limit,
    });
    return {
      items,
      meta: { page: page.page, limit: page.limit, total, totalPages: Math.ceil(total / page.limit) },
    };
  }

  async findOneScoped(orgId: string, id: string): Promise<Invoice> {
    const invoice = await this.invoices.findOne({ where: { id, orgId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(orgId: string, id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const invoice = await this.findOneScoped(orgId, id);
    if (dto.status) invoice.status = dto.status;
    return this.invoices.save(invoice);
  }

  async setPdfUrl(id: string, pdfUrl: string): Promise<void> {
    await this.invoices.update({ id }, { pdfUrl });
  }
}
