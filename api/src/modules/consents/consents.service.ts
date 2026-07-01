import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Consent, ConsentDocument } from './schemas/consent.schema';
import { CreateConsentDto } from './dto/create-consent.dto';
import { ClientsService } from '../clients/clients.service';
import { AuditService } from '../audit/audit.service';
import { PaginationDto, Paginated } from '../../common/dto/pagination.dto';

@Injectable()
export class ConsentsService {
  constructor(
    @InjectModel(Consent.name) private readonly consents: Model<ConsentDocument>,
    private readonly clients: ClientsService,
    private readonly audit: AuditService,
  ) {}

  async create(orgId: string, dto: CreateConsentDto, userId?: string) {
    let dataPrincipal = dto.dataPrincipal ?? null;
    if (!dataPrincipal && dto.clientId) {
      const c = await this.clients.findOneScoped(orgId, dto.clientId).catch(() => null);
      dataPrincipal = c?.name ?? null;
    }
    const doc = await this.consents.create({
      orgId,
      clientId: dto.clientId ?? null,
      dataPrincipal,
      purpose: dto.purpose,
      basis: dto.basis ?? 'consent',
      status: 'active',
      grantedAt: new Date().toISOString(),
      expiresAt: dto.expiresAt ?? null,
      notes: dto.notes ?? null,
    });
    await this.audit.log({ action: 'consent.recorded', orgId, userId, resourceId: doc.id, meta: { purpose: doc.purpose, basis: doc.basis } });
    return doc.toJSON();
  }

  async list(orgId: string, page: PaginationDto): Promise<Paginated<any>> {
    const [items, total] = await Promise.all([
      this.consents.find({ orgId }).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).exec(),
      this.consents.countDocuments({ orgId }).exec(),
    ]);
    return { items: items.map((c) => c.toJSON()), meta: { page: page.page, limit: page.limit, total, totalPages: Math.ceil(total / page.limit) } };
  }

  async withdraw(orgId: string, id: string, userId?: string) {
    const doc = await this.consents.findOne({ _id: id, orgId }).exec();
    if (!doc) throw new NotFoundException('Consent not found');
    if (doc.status === 'active') {
      doc.status = 'withdrawn';
      doc.withdrawnAt = new Date().toISOString();
      await doc.save();
      await this.audit.log({ action: 'consent.withdrawn', orgId, userId, resourceId: doc.id });
    }
    return doc.toJSON();
  }
}
