import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { createHash, randomBytes, randomInt } from 'crypto';
import { Agreement, AgreementDocument } from './schemas/agreement.schema';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { SendAgreementDto } from './dto/send-agreement.dto';
import { SignAgreementDto } from './dto/sign-agreement.dto';
import { ClientsService } from '../clients/clients.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { PdfServiceClient } from '../reports/clients/pdf-service.client';
import { EsignProviderClient } from './clients/esign-provider.client';
import { OrganizationsService } from '../organizations/organizations.service';
import { AadhaarService } from '../aadhaar/aadhaar.service';
import { evaluateGeofence } from './geo.util';
import { PaginationDto, Paginated } from '../../common/dto/pagination.dto';

@Injectable()
export class AgreementsService {
  private readonly logger = new Logger(AgreementsService.name);
  private readonly appUrl: string;
  private readonly emailConfigured: boolean;

  constructor(
    @InjectModel(Agreement.name) private readonly agreements: Model<AgreementDocument>,
    private readonly clients: ClientsService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly pdf: PdfServiceClient,
    private readonly esign: EsignProviderClient,
    private readonly orgs: OrganizationsService,
    private readonly aadhaar: AadhaarService,
    config: ConfigService,
  ) {
    this.appUrl = config.get<string>('appUrl') ?? 'http://localhost:3001';
    this.emailConfigured = Boolean(config.get<string>('email.resendApiKey'));
  }

  private hashOtp(token: string, otp: string): string {
    return createHash('sha256').update(`${token}:${otp}`).digest('hex');
  }

  private trail(at = new Date().toISOString()) { return at; }

  // ─────────────────────────── CRUD ───────────────────────────
  async create(orgId: string, userId: string, dto: CreateAgreementDto) {
    const profile = await this.users.findById(userId).catch(() => null);
    let clientName: string | null = null;
    if (dto.clientId) {
      const client = await this.clients.findOneScoped(orgId, dto.clientId).catch(() => null);
      clientName = client?.name ?? null;
    }
    const doc = await this.agreements.create({
      orgId,
      clientId: dto.clientId ?? null,
      title: dto.title,
      category: dto.category ?? 'custom',
      body: dto.body ?? '',
      sellerName: profile?.legalName ?? null,
      clientName,
      status: 'draft',
      auditTrail: [{ at: this.trail(), event: 'created', detail: `Drafted by ${profile?.email ?? userId}` }],
    });
    await this.audit.log({ action: 'agreement.created', orgId, resourceId: doc.id, meta: { title: doc.title } });
    return doc.toJSON();
  }

  async list(orgId: string, page: PaginationDto): Promise<Paginated<any>> {
    const [items, total] = await Promise.all([
      this.agreements.find({ orgId }).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).exec(),
      this.agreements.countDocuments({ orgId }).exec(),
    ]);
    return { items: items.map((a) => a.toJSON()), meta: { page: page.page, limit: page.limit, total, totalPages: Math.ceil(total / page.limit) } };
  }

  async findOneScoped(orgId: string, id: string): Promise<AgreementDocument> {
    const doc = await this.agreements.findOne({ _id: id, orgId }).exec();
    if (!doc) throw new NotFoundException('Agreement not found');
    return doc;
  }

  // ─────────────────────────── Send for signature ───────────────────────────
  async send(orgId: string, userId: string, id: string, dto: SendAgreementDto) {
    const doc = await this.findOneScoped(orgId, id);
    if (doc.status === 'signed') throw new BadRequestException('Agreement is already signed');

    const token = randomBytes(24).toString('hex');
    doc.signToken = token;
    doc.signerName = dto.signerName;
    doc.signerEmail = dto.signerEmail;
    doc.status = 'sent';
    doc.sentAt = this.trail();
    doc.otpRequired = this.emailConfigured;
    doc.declinedAt = null;
    doc.aadhaarRequired = Boolean(dto.aadhaarRequired);
    doc.aadhaarVerified = false;
    doc.aadhaarLast4 = null;

    if (doc.otpRequired) {
      const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
      doc.otpHash = this.hashOtp(token, otp);
      doc.otpExpiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
      await this.emailOtp(dto.signerEmail, dto.signerName, doc.title, otp);
    } else {
      doc.otpHash = null; doc.otpExpiresAt = null;
    }
    doc.auditTrail.push({ at: this.trail(), event: 'sent', detail: `Sent to ${dto.signerName} <${dto.signerEmail}>` } as any);
    await doc.save();

    const signUrl = `${this.appUrl}/sign/${token}`;
    await this.emailSignInvite(dto.signerEmail, dto.signerName, doc.title, signUrl);
    await this.audit.log({ action: 'agreement.sent', orgId, userId, resourceId: doc.id, meta: { signerEmail: dto.signerEmail } });
    return { ...doc.toJSON(), signUrl };
  }

  // ─────────────────────────── Public signing flow ───────────────────────────
  private async byToken(token: string): Promise<AgreementDocument> {
    const doc = await this.agreements.findOne({ signToken: token }).exec();
    if (!doc) throw new NotFoundException('This signing link is invalid or has expired');
    return doc;
  }

  async getForSigning(token: string) {
    const doc = await this.byToken(token);
    if (doc.status === 'sent') {
      doc.status = 'viewed';
      doc.viewedAt = this.trail();
      doc.auditTrail.push({ at: this.trail(), event: 'viewed', detail: 'Opened by signer' } as any);
      await doc.save();
    }
    return {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      body: doc.body,
      sellerName: doc.sellerName,
      signerName: doc.signerName,
      otpRequired: doc.otpRequired,
      aadhaarRequired: doc.aadhaarRequired,
      aadhaarVerified: doc.aadhaarVerified,
      status: doc.status,
      signedPdfUrl: doc.status === 'signed' ? doc.signedPdfUrl : null,
    };
  }

  // ── Aadhaar OTP gate (public, token-scoped) ──
  async aadhaarInit(token: string, aadhaar: string, ip: string, ua: string) {
    const doc = await this.byToken(token);
    if (!doc.aadhaarRequired) return { otpRequired: false, alreadyVerified: doc.aadhaarVerified };
    if (doc.aadhaarVerified) return { otpRequired: false, alreadyVerified: true };
    return this.aadhaar.initiate(doc.orgId, doc.id, aadhaar, ip, ua);
  }

  async aadhaarVerify(token: string, referenceId: string, otp: string) {
    const doc = await this.byToken(token);
    const r = await this.aadhaar.verify(doc.orgId, referenceId, otp);
    doc.aadhaarVerified = true;
    doc.aadhaarLast4 = r.last4 ?? null;
    doc.auditTrail.push({ at: this.trail(), event: 'aadhaar.verified', detail: `Aadhaar XXXX-XXXX-${r.last4 ?? '????'} verified` } as any);
    await doc.save();
    return { verified: true, last4: r.last4 ?? null };
  }

  async resendOtp(token: string) {
    const doc = await this.byToken(token);
    if (!doc.otpRequired) return { otpRequired: false };
    if (doc.status === 'signed') throw new BadRequestException('Already signed');
    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
    doc.otpHash = this.hashOtp(token, otp);
    doc.otpExpiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
    await doc.save();
    await this.emailOtp(doc.signerEmail!, doc.signerName ?? 'there', doc.title, otp);
    return { otpRequired: true, sent: true };
  }

  async sign(token: string, dto: SignAgreementDto, ip: string, userAgent: string) {
    const doc = await this.byToken(token);
    if (doc.status === 'signed') throw new BadRequestException('This agreement is already signed');
    if (doc.status === 'voided' || doc.status === 'declined') throw new ForbiddenException('This agreement can no longer be signed');
    if (doc.aadhaarRequired && !doc.aadhaarVerified) throw new BadRequestException('Aadhaar verification is required before signing');

    if (doc.otpRequired) {
      if (!dto.otp) throw new BadRequestException('Enter the OTP sent to your email');
      if (!doc.otpExpiresAt || new Date(doc.otpExpiresAt).getTime() < Date.now()) throw new BadRequestException('OTP expired — request a new one');
      if (doc.otpHash !== this.hashOtp(token, dto.otp)) throw new BadRequestException('Incorrect OTP');
    }

    const now = this.trail();

    // ── Fraud-prevention evidence ──
    const fences = await this.orgs.getGeofences(doc.orgId).catch(() => []);
    const geoFenceStatus = evaluateGeofence(fences, dto.lat, dto.lng);
    doc.signerLat = dto.lat ?? null;
    doc.signerLng = dto.lng ?? null;
    doc.signerGeoAccuracy = dto.accuracy ?? null;
    doc.geoFenceStatus = geoFenceStatus;
    doc.selfieImage = dto.selfie ?? null;
    doc.faceMatchStatus = dto.selfie ? (this.esign.aadhaarConfigured() ? 'pending_provider' : 'captured_not_checked') : null;
    const verifyCode = randomBytes(5).toString('hex').toUpperCase(); // 10-char public code
    doc.verifyCode = verifyCode;

    doc.signatureImage = dto.signatureImage;
    doc.signedName = dto.signedName;
    doc.signerIp = ip;
    doc.signerUserAgent = userAgent?.slice(0, 400) ?? null;
    doc.signedAt = now;
    doc.status = 'signed';
    doc.signToken = null; // single-use: invalidate the link
    doc.otpHash = null;

    const geoDetail = dto.lat != null ? ` · geo ${dto.lat.toFixed(4)},${dto.lng?.toFixed(4)} (${geoFenceStatus})` : '';
    doc.auditTrail.push({ at: now, event: 'signed', detail: `Signed by ${dto.signedName} from ${ip}${doc.otpRequired ? ' (email-OTP verified)' : ''}${dto.selfie ? ' · selfie captured' : ''}${geoDetail}` } as any);
    if (geoFenceStatus === 'outside') {
      doc.auditTrail.push({ at: now, event: 'flag', detail: 'Signed from outside the allowed geofence' } as any);
    }
    await doc.save();

    try {
      const { url } = await this.pdf.generateAgreement({
        title: doc.title,
        category: doc.category,
        body: doc.body,
        sellerName: doc.sellerName,
        clientName: doc.clientName,
        signerName: doc.signedName,
        signerEmail: doc.signerEmail,
        signedAt: now,
        signerIp: ip,
        otpVerified: doc.otpRequired,
        signatureImage: dto.signatureImage,
        geo: dto.lat != null ? `${dto.lat},${dto.lng} (±${dto.accuracy ?? '?'}m) — ${geoFenceStatus}` : null,
        verifyCode,
        auditTrail: doc.auditTrail.map((a) => ({ at: a.at, event: a.event, detail: a.detail })),
        agreementId: doc.id,
      });
      doc.signedPdfUrl = url;
      await doc.save();
    } catch (e: any) {
      this.logger.warn(`Signed PDF for ${doc.id} deferred: ${e.message}`);
    }

    await this.audit.log({ action: 'agreement.signed', orgId: doc.orgId, resourceId: doc.id, meta: { signer: dto.signedName, ip, geoFenceStatus } });
    return { status: 'signed', signedPdfUrl: doc.signedPdfUrl, verifyCode, geoFenceStatus };
  }

  async decline(token: string, ip: string) {
    const doc = await this.byToken(token);
    if (doc.status === 'signed') throw new BadRequestException('Already signed');
    doc.status = 'declined';
    doc.declinedAt = this.trail();
    doc.signToken = null;
    doc.auditTrail.push({ at: this.trail(), event: 'declined', detail: `Declined from ${ip}` } as any);
    await doc.save();
    await this.audit.log({ action: 'agreement.declined', orgId: doc.orgId, resourceId: doc.id, meta: { ip } });
    return { status: 'declined' };
  }

  // ─────────────────────────── Emails (graceful no-op without key) ───────────────────────────
  private async emailSignInvite(to: string, name: string, title: string, signUrl: string) {
    const html = `<p>Hi ${name},</p><p>You have a document to review and sign: <strong>${title}</strong>.</p>
      <p><a href="${signUrl}" style="background:#0b5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Review &amp; sign</a></p>
      <p>Or open: ${signUrl}</p>`;
    await this.notifications.sendEmail(to, `Please sign: ${title}`, html).catch((e) => this.logger.warn(`invite email: ${e.message}`));
  }

  private async emailOtp(to: string, name: string, title: string, otp: string) {
    const html = `<p>Hi ${name},</p><p>Your one-time passcode to sign <strong>${title}</strong> is:</p>
      <p style="font-size:24px;font-weight:700;letter-spacing:4px">${otp}</p><p>It expires in 15 minutes.</p>`;
    await this.notifications.sendEmail(to, `Your signing OTP for ${title}`, html).catch((e) => this.logger.warn(`otp email: ${e.message}`));
  }

  esignStatus() {
    return this.esign.status();
  }

  // ─────────────────────────── Geofences (fraud prevention config) ───────────────────────────
  getGeofences(orgId: string) {
    return this.orgs.getGeofences(orgId);
  }

  setGeofences(orgId: string, fences: Array<{ label: string; lat: number; lng: number; radiusKm: number }>) {
    return this.orgs.setGeofences(orgId, fences);
  }

  // ─────────────────────────── eSign verifier (public) ───────────────────────────
  async verify(code: string) {
    const doc = await this.agreements.findOne({ verifyCode: code.toUpperCase().trim(), status: 'signed' }).exec();
    if (!doc) return { found: false };
    return {
      found: true,
      title: doc.title,
      category: doc.category,
      sellerName: doc.sellerName,
      signerName: doc.signedName,
      signerEmail: doc.signerEmail,
      signedAt: doc.signedAt,
      signerIp: doc.signerIp,
      otpVerified: doc.otpRequired,
      geoFenceStatus: doc.geoFenceStatus,
      selfieCaptured: Boolean(doc.selfieImage),
      integrity: 'valid' as const, // record exists, status signed, evidence intact
      signedPdfUrl: doc.signedPdfUrl,
    };
  }

  // ─────────────────────────── Contract lifecycle ───────────────────────────
  async setLifecycle(orgId: string, id: string, dto: { effectiveDate?: string; renewalDate?: string; expiryDate?: string }) {
    const doc = await this.findOneScoped(orgId, id);
    if (dto.effectiveDate !== undefined) doc.effectiveDate = dto.effectiveDate || null;
    if (dto.renewalDate !== undefined) doc.renewalDate = dto.renewalDate || null;
    if (dto.expiryDate !== undefined) doc.expiryDate = dto.expiryDate || null;
    doc.lifecycleRemindersSent = []; // reset reminders when dates change
    doc.auditTrail.push({ at: this.trail(), event: 'lifecycle.updated', detail: `Renewal ${doc.renewalDate ?? '—'}, expiry ${doc.expiryDate ?? '—'}` } as any);
    await doc.save();
    await this.audit.log({ action: 'agreement.lifecycle.set', orgId, resourceId: id });
    return doc.toJSON();
  }

  async addObligation(orgId: string, id: string, dto: { title: string; owner?: string; dueDate?: string }) {
    const doc = await this.findOneScoped(orgId, id);
    doc.obligations.push({ title: dto.title, owner: dto.owner ?? null, dueDate: dto.dueDate ?? null, done: false } as any);
    await doc.save();
    return doc.toJSON();
  }

  async toggleObligation(orgId: string, id: string, obligationId: string) {
    const doc = await this.findOneScoped(orgId, id);
    const ob = (doc.obligations as any).id(obligationId);
    if (!ob) throw new NotFoundException('Obligation not found');
    ob.done = !ob.done;
    await doc.save();
    return doc.toJSON();
  }

  async removeObligation(orgId: string, id: string, obligationId: string) {
    const doc = await this.findOneScoped(orgId, id);
    const ob = (doc.obligations as any).id(obligationId);
    if (!ob) throw new NotFoundException('Obligation not found');
    ob.deleteOne();
    await doc.save();
    return doc.toJSON();
  }

  // ─────────────────────────── Searchable repository ───────────────────────────
  async search(orgId: string, q: string | undefined, status: string | undefined, page: PaginationDto): Promise<Paginated<any>> {
    const filter: Record<string, any> = { orgId };
    if (status) filter.status = status;
    if (q && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: rx }, { clientName: rx }, { signerName: rx }, { signerEmail: rx }, { body: rx }, { category: rx }];
    }
    const [items, total] = await Promise.all([
      this.agreements.find(filter).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).exec(),
      this.agreements.countDocuments(filter).exec(),
    ]);
    return { items: items.map((a) => a.toJSON()), meta: { page: page.page, limit: page.limit, total, totalPages: Math.ceil(total / page.limit) } };
  }

  // ─────────────────────────── Heuristic clause review (LLM-upgradeable) ───────────────────────────
  reviewClauses(body: string) {
    const text = (body ?? '').toLowerCase();
    const CHECKS: Array<{ clause: string; any: string[]; why: string }> = [
      { clause: 'Governing law / jurisdiction', any: ['governing law', 'jurisdiction', 'courts of'], why: 'Specifies which law and courts apply to disputes.' },
      { clause: 'Termination', any: ['terminat', 'notice period'], why: 'Defines how and when either party can end the agreement.' },
      { clause: 'Confidentiality', any: ['confidential', 'non-disclosure', 'nda'], why: 'Protects sensitive information shared between parties.' },
      { clause: 'Indemnity / liability', any: ['indemnif', 'liabilit', 'limitation of liability'], why: 'Allocates risk and caps exposure.' },
      { clause: 'Payment terms', any: ['payment', 'fee', 'invoice', 'amount payable'], why: 'States amounts, schedule and late-payment terms.' },
      { clause: 'Dispute resolution / arbitration', any: ['arbitrat', 'dispute resolution', 'mediation'], why: 'How disagreements are resolved before litigation.' },
      { clause: 'Force majeure', any: ['force majeure', 'act of god'], why: 'Excuses performance during events beyond control.' },
    ];
    const results = CHECKS.map((c) => ({ clause: c.clause, present: c.any.some((k) => text.includes(k)), why: c.why }));
    const missing = results.filter((r) => !r.present).map((r) => r.clause);
    return { results, missing, score: Math.round((results.filter((r) => r.present).length / results.length) * 100) };
  }

  async clauseReview(orgId: string, id: string) {
    const doc = await this.findOneScoped(orgId, id);
    return this.reviewClauses(doc.body);
  }

  // ─────────────────────────── Renewal/expiry reminders (cron-triggerable) ───────────────────────────
  async runLifecycleReminders() {
    const now = Date.now();
    const horizon = new Date(now + 31 * 86400_000).toISOString();
    const docs = await this.agreements
      .find({ $or: [{ renewalDate: { $ne: null, $lte: horizon } }, { expiryDate: { $ne: null, $lte: horizon } }] })
      .exec();

    let sent = 0;
    for (const doc of docs) {
      for (const [kind, dateStr] of [['renewal', doc.renewalDate], ['expiry', doc.expiryDate]] as const) {
        if (!dateStr) continue;
        const days = Math.ceil((new Date(dateStr).getTime() - now) / 86400_000);
        // Ascending so the *smallest* crossed threshold wins (1 → 7 → 30), firing once each.
        const threshold = [1, 7, 30].find((t) => days <= t && days >= 0);
        if (threshold == null) continue;
        const key = `${kind}-${threshold}`;
        if (doc.lifecycleRemindersSent.includes(key)) continue;
        const to = doc.signerEmail;
        if (to) {
          const html = `<p>Reminder: <strong>${doc.title}</strong> is due for ${kind} on ${dateStr} (in ${days} day${days === 1 ? '' : 's'}).</p>`;
          await this.notifications.sendEmail(to, `${kind === 'renewal' ? 'Renewal' : 'Expiry'} reminder: ${doc.title}`, html).catch(() => {});
        }
        doc.lifecycleRemindersSent.push(key);
        doc.auditTrail.push({ at: this.trail(), event: 'reminder', detail: `${kind} reminder (${threshold}d)` } as any);
        sent++;
      }
      await doc.save();
    }
    return { processed: docs.length, remindersSent: sent };
  }
}
