import { Injectable, Logger } from '@nestjs/common';
import { InvoicesService } from '../invoices/invoices.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { monthsElapsed, daysToDue, REMINDER_THRESHOLDS } from '../../common/constants/fema';

/**
 * FEMA aging sweep (design §13, §18). Runs daily: for each unpaid invoice, sends a reminder
 * at 9 / 10 / 11 months and on the realisation deadline — each at most once (idempotent via
 * femaRemindersSent). These have legal consequences and must never silently fail.
 */
@Injectable()
export class FemaReminderService {
  private readonly logger = new Logger(FemaReminderService.name);
  private ownerEmailCache = new Map<string, string | null>();

  constructor(
    private readonly invoices: InvoicesService,
    private readonly orgs: OrganizationsService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async sweep(now: Date = new Date()): Promise<{ scanned: number; sent: number }> {
    this.ownerEmailCache.clear();
    const unpaid = await this.invoices.findAllUnpaid();
    let sent = 0;

    for (const inv of unpaid) {
      if (!inv.femaDueDate) continue;
      const months = monthsElapsed(inv.invoiceDate, now);
      const days = daysToDue(inv.femaDueDate, now);

      // Mark overdue once the realisation window has passed.
      if (days <= 0 && inv.status !== 'overdue') {
        await this.invoices.markOverdue(inv.id);
      }

      const already: string[] = inv.femaRemindersSent ?? [];
      const due = REMINDER_THRESHOLDS.filter((t) => months >= t.months && !already.includes(t.key));
      if (due.length === 0) continue;

      // Send only the most advanced unsent threshold to avoid a burst of emails.
      const threshold = due[due.length - 1];
      const email = await this.resolveOwnerEmail(inv.orgId);
      if (!email) { this.logger.warn(`No owner email for org ${inv.orgId}; skipping ${inv.number}`); continue; }

      await this.notifications.sendEmail(
        email,
        `Action needed: ${inv.number} — ${threshold.label}`,
        this.buildEmail(inv, threshold.label, days),
      );
      // Mark every threshold up to and including the one sent, so we don't re-send earlier ones.
      for (const t of due) await this.invoices.pushReminderSent(inv.id, t.key);

      await this.audit.log({
        action: 'fema.reminder.sent', orgId: inv.orgId, resourceId: inv.id,
        meta: { number: inv.number, threshold: threshold.key, daysToDue: days },
      });
      sent += 1;
    }

    this.logger.log(`FEMA sweep: scanned ${unpaid.length} unpaid invoice(s), sent ${sent} reminder(s).`);
    return { scanned: unpaid.length, sent };
  }

  private async resolveOwnerEmail(orgId: string): Promise<string | null> {
    if (this.ownerEmailCache.has(orgId)) return this.ownerEmailCache.get(orgId)!;
    let email: string | null = null;
    const org = await this.orgs.findById(orgId);
    if (org?.ownerId) {
      const owner = await this.users.findById(org.ownerId);
      email = owner?.email ?? null;
    }
    this.ownerEmailCache.set(orgId, email);
    return email;
  }

  private buildEmail(inv: any, label: string, days: number): string {
    const dueLine = days <= 0
      ? `The FEMA realisation deadline (<strong>${inv.femaDueDate}</strong>) has passed.`
      : `The FEMA realisation deadline is <strong>${inv.femaDueDate}</strong> — about <strong>${days} day(s)</strong> away.`;
    return `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#1a222c">
        <h2 style="color:#047857;margin:0 0 8px">${label}</h2>
        <p>Invoice <strong>${inv.number}</strong> (${inv.currency} ${inv.subtotal}, ₹${inv.inrEquivalent})
        is approaching its FEMA realisation deadline.</p>
        <p>${dueLine}</p>
        <p>Under FEMA, export proceeds must typically be realised within one year of the invoice date.
        Missing it while on LUT can make IGST payable retroactively.</p>
        <p>If you've already been paid, mark the invoice as paid and upload the FIRC / e-FIRA in Crossbill.</p>
        <p style="color:#5b6573;font-size:12px">— Crossbill · Built by Anujali Technologies</p>
      </div>`;
  }
}
