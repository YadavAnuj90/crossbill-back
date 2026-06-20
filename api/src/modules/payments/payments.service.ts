import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { RazorpayClient } from './clients/razorpay.client';
import { InvoicesService } from '../invoices/invoices.service';
import { ClientsService } from '../clients/clients.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { PaginationDto, Paginated } from '../../common/dto/pagination.dto';
import { planById } from './plans';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly appUrl: string;

  constructor(
    @InjectModel(Payment.name) private readonly payments: Model<PaymentDocument>,
    private readonly razorpay: RazorpayClient,
    private readonly invoices: InvoicesService,
    private readonly clients: ClientsService,
    private readonly orgs: OrganizationsService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.appUrl = config.get<string>('appUrl') ?? 'http://localhost:3001';
  }

  configured(): boolean {
    return this.razorpay.isConfigured();
  }

  /** The INR amount to charge for an invoice (domestic grandTotal is INR; export uses inrEquivalent). */
  private invoiceInrAmount(invoice: any): number {
    const v = invoice.type === 'domestic' ? invoice.grandTotal : invoice.inrEquivalent;
    const n = parseFloat(v ?? '0');
    if (!n || n <= 0) throw new BadRequestException('Invoice has no payable INR amount');
    return n;
  }

  // ─────────────────────────── Invoice payment links ───────────────────────────
  async createInvoiceLink(orgId: string, invoiceId: string) {
    const invoice = await this.invoices.findOneScoped(orgId, invoiceId);
    if (invoice.status === 'paid') throw new BadRequestException('Invoice is already paid');

    const existing = await this.payments
      .findOne({ orgId, invoiceId, purpose: 'invoice', status: { $in: ['created'] } })
      .exec();
    if (existing) return existing.toJSON();

    const client = await this.clients.findOneScoped(orgId, invoice.clientId).catch(() => null);
    const amountInr = this.invoiceInrAmount(invoice);
    const amountPaise = Math.round(amountInr * 100);

    const link = await this.razorpay.createPaymentLink({
      amountPaise,
      currency: 'INR',
      description: `Payment for invoice ${invoice.number}`,
      referenceId: `inv_${invoice.id}_${Date.now()}`,
      customer: client ? { name: client.name, email: client.email ?? undefined } : undefined,
      notes: { orgId, purpose: 'invoice', invoiceId: invoice.id, invoiceNumber: invoice.number },
      callbackUrl: `${this.appUrl}/invoices/${invoice.id}?paid=1`,
    });

    const doc = await this.payments.create({
      orgId, purpose: 'invoice', invoiceId: invoice.id, invoiceNumber: invoice.number,
      razorpayLinkId: link.id, shortUrl: link.short_url,
      amount: amountInr.toFixed(2), amountPaise, currency: 'INR', status: 'created',
    });
    await this.audit.log({ action: 'payment.link.created', orgId, resourceId: doc.id, meta: { invoiceId: invoice.id, amount: doc.amount } });
    return doc.toJSON();
  }

  // ─────────────────────────── Subscription / billing links ───────────────────────────
  async createSubscriptionLink(orgId: string, userId: string, planId: string, email?: string) {
    const plan = planById(planId);
    if (!plan || plan.priceInr <= 0) throw new BadRequestException('Unknown or free plan');
    const amountPaise = Math.round(plan.priceInr * 100);

    const link = await this.razorpay.createPaymentLink({
      amountPaise,
      currency: 'INR',
      description: `Crossbill ${plan.name} plan`,
      referenceId: `sub_${orgId}_${planId}_${Date.now()}`,
      customer: email ? { email } : undefined,
      notes: { orgId, purpose: 'subscription', planId },
      callbackUrl: `${this.appUrl}/billing?upgraded=1`,
    });

    const doc = await this.payments.create({
      orgId, purpose: 'subscription', planId,
      razorpayLinkId: link.id, shortUrl: link.short_url,
      amount: plan.priceInr.toFixed(2), amountPaise, currency: 'INR', status: 'created',
    });
    await this.audit.log({ action: 'billing.checkout.created', orgId, userId, resourceId: doc.id, meta: { planId } });
    return { shortUrl: link.short_url, paymentId: doc.id, plan };
  }

  // ─────────────────────────── Webhook (auto-reconcile) ───────────────────────────
  async handleWebhook(rawBody: Buffer | string, signature: string | undefined) {
    if (!this.razorpay.verifyWebhook(rawBody, signature)) {
      this.logger.warn('Razorpay webhook rejected: bad signature');
      throw new BadRequestException('Invalid signature');
    }
    const body = JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'));
    const event: string = body?.event ?? '';
    this.logger.log(`Razorpay webhook: ${event}`);

    // We only act on a fully-paid payment link.
    if (event !== 'payment_link.paid') return { received: true, ignored: event };

    const linkEntity = body?.payload?.payment_link?.entity ?? {};
    const paymentEntity = body?.payload?.payment?.entity ?? {};
    const linkId: string | undefined = linkEntity.id;
    const notes = linkEntity.notes ?? {};
    if (!linkId) return { received: true, ignored: 'no-link-id' };

    const doc = await this.payments.findOne({ razorpayLinkId: linkId }).exec();
    if (!doc) {
      this.logger.warn(`Webhook for unknown link ${linkId}`);
      return { received: true, ignored: 'unknown-link' };
    }
    if (doc.status === 'paid') return { received: true, idempotent: true }; // already processed

    doc.status = 'paid';
    doc.razorpayPaymentId = paymentEntity.id ?? null;
    doc.paidAt = new Date().toISOString();
    await doc.save();

    if (doc.purpose === 'invoice' && (doc.invoiceId || notes.invoiceId)) {
      const invoiceId = doc.invoiceId ?? notes.invoiceId;
      await this.invoices.markPaid(doc.orgId, invoiceId);
      await this.audit.log({ action: 'payment.reconciled', orgId: doc.orgId, resourceId: invoiceId, meta: { linkId, paymentId: doc.razorpayPaymentId, amount: doc.amount } });
    } else if (doc.purpose === 'subscription' && doc.planId) {
      await this.orgs.setPlan(doc.orgId, doc.planId);
      await this.audit.log({ action: 'billing.activated', orgId: doc.orgId, resourceId: doc.id, meta: { planId: doc.planId } });
    }
    return { received: true, reconciled: true };
  }

  // ─────────────────────────── Reads ───────────────────────────
  listForInvoice(orgId: string, invoiceId: string) {
    return this.payments.find({ orgId, invoiceId }).sort({ createdAt: -1 }).exec().then((r) => r.map((p) => p.toJSON()));
  }

  async list(orgId: string, page: PaginationDto): Promise<Paginated<any>> {
    const [items, total] = await Promise.all([
      this.payments.find({ orgId, purpose: 'invoice' }).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).exec(),
      this.payments.countDocuments({ orgId, purpose: 'invoice' }).exec(),
    ]);
    return { items: items.map((p) => p.toJSON()), meta: { page: page.page, limit: page.limit, total, totalPages: Math.ceil(total / page.limit) } };
  }
}
