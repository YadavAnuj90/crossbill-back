import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AgreementTemplate, AgreementTemplateDocument } from './schemas/agreement-template.schema';
import { CreateTemplateDto, CreateFromTemplateDto, BulkSendDto } from './dto/template.dto';
import { AgreementsService } from '../agreements/agreements.service';
import { AuditService } from '../audit/audit.service';
import { PaginationDto, Paginated } from '../../common/dto/pagination.dto';

const FIELD_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;

@Injectable()
export class AgreementTemplatesService {
  constructor(
    @InjectModel(AgreementTemplate.name) private readonly templates: Model<AgreementTemplateDocument>,
    private readonly agreements: AgreementsService,
    private readonly audit: AuditService,
  ) {}

  /** Distinct {{field}} names found in a body. */
  static extractFields(body: string): string[] {
    const out = new Set<string>();
    let m: RegExpExecArray | null;
    FIELD_RE.lastIndex = 0;
    while ((m = FIELD_RE.exec(body)) !== null) out.add(m[1]);
    return [...out];
  }

  /** Substitute {{field}} → values[field]; unknown fields are left blank. */
  static render(body: string, values: Record<string, string> = {}): string {
    return body.replace(FIELD_RE, (_, name: string) => (values[name] ?? '').toString());
  }

  async create(orgId: string, dto: CreateTemplateDto) {
    const doc = await this.templates.create({
      orgId,
      name: dto.name,
      category: dto.category ?? 'custom',
      body: dto.body,
      fields: AgreementTemplatesService.extractFields(dto.body),
    });
    await this.audit.log({ action: 'template.created', orgId, resourceId: doc.id, meta: { name: doc.name } });
    return doc.toJSON();
  }

  async list(orgId: string, page: PaginationDto): Promise<Paginated<any>> {
    const [items, total] = await Promise.all([
      this.templates.find({ orgId }).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).exec(),
      this.templates.countDocuments({ orgId }).exec(),
    ]);
    return { items: items.map((t) => t.toJSON()), meta: { page: page.page, limit: page.limit, total, totalPages: Math.ceil(total / page.limit) } };
  }

  async findOneScoped(orgId: string, id: string): Promise<AgreementTemplateDocument> {
    const doc = await this.templates.findOne({ _id: id, orgId }).exec();
    if (!doc) throw new NotFoundException('Template not found');
    return doc;
  }

  async remove(orgId: string, id: string) {
    const res = await this.templates.deleteOne({ _id: id, orgId }).exec();
    if (!res.deletedCount) throw new NotFoundException('Template not found');
    await this.audit.log({ action: 'template.deleted', orgId, resourceId: id });
    return { deleted: true };
  }

  /** Create a single draft agreement from a template (merge fields applied). */
  async createFromTemplate(orgId: string, userId: string, templateId: string, dto: CreateFromTemplateDto) {
    const tpl = await this.findOneScoped(orgId, templateId);
    const body = AgreementTemplatesService.render(tpl.body, dto.values ?? {});
    return this.agreements.create(orgId, userId, {
      title: dto.title ?? tpl.name,
      category: tpl.category,
      body,
      clientId: dto.clientId,
    });
  }

  /** Create + send an agreement to each recipient in one go (bulk "journey"). */
  async bulkSend(orgId: string, userId: string, templateId: string, dto: BulkSendDto) {
    const tpl = await this.findOneScoped(orgId, templateId);
    const results: Array<{ signerEmail: string; agreementId?: string; signUrl?: string; status: string; error?: string }> = [];

    for (const r of dto.recipients) {
      try {
        const body = AgreementTemplatesService.render(tpl.body, r.values ?? {});
        const agreement: any = await this.agreements.create(orgId, userId, {
          title: r.title ?? tpl.name,
          category: tpl.category,
          body,
          clientId: r.clientId,
        });
        const sent: any = await this.agreements.send(orgId, userId, agreement.id, {
          signerName: r.signerName,
          signerEmail: r.signerEmail,
        });
        results.push({ signerEmail: r.signerEmail, agreementId: agreement.id, signUrl: sent.signUrl, status: 'sent' });
      } catch (e: any) {
        results.push({ signerEmail: r.signerEmail, status: 'failed', error: e?.message ?? 'send failed' });
      }
    }
    await this.audit.log({ action: 'template.bulk_send', orgId, userId, resourceId: templateId, meta: { count: dto.recipients.length } });
    return { templateId, sent: results.filter((r) => r.status === 'sent').length, total: results.length, results };
  }
}
