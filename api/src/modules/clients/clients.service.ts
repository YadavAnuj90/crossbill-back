import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PaginationDto, Paginated } from '../../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';

/** All queries are scoped by orgId (design §10). Supports foreign (export) + domestic (GST) clients. */
@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private readonly clients: Model<ClientDocument>,
    private readonly audit: AuditService,
  ) {}

  private normalize(dto: Partial<CreateClientDto>): Record<string, any> {
    const out: Record<string, any> = { ...dto };
    if (dto.type === 'foreign') {
      if (dto.country) out.country = dto.country.toUpperCase();
      out.stateCode = null; out.gstin = null; out.customerType = null;
    } else if (dto.type === 'domestic') {
      out.country = null;
      if (dto.gstin) out.gstin = dto.gstin.toUpperCase();
      if (dto.customerType === 'b2c') out.gstin = null; // B2C has no GSTIN
    }
    return out;
  }

  async create(orgId: string, dto: CreateClientDto, userId?: string) {
    const doc = await this.clients.create({ ...this.normalize(dto), orgId });
    await this.audit.log({
      action: 'client.created', orgId, userId, resourceId: doc.id,
      meta: { name: doc.name, type: doc.type },
    });
    return doc;
  }

  async list(orgId: string, page: PaginationDto): Promise<Paginated<any>> {
    const [items, total] = await Promise.all([
      this.clients.find({ orgId }).sort({ createdAt: -1 }).skip(page.skip).limit(page.limit).exec(),
      this.clients.countDocuments({ orgId }).exec(),
    ]);
    return {
      items: items.map((c) => c.toJSON()),
      meta: { page: page.page, limit: page.limit, total, totalPages: Math.ceil(total / page.limit) },
    };
  }

  async findOneScoped(orgId: string, id: string): Promise<ClientDocument> {
    const client = await this.clients.findOne({ _id: id, orgId }).exec();
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  /** All clients for an org (used to enrich invoices in the document bundle). */
  findAllForOrg(orgId: string) {
    return this.clients.find({ orgId }).exec();
  }

  async update(orgId: string, id: string, dto: UpdateClientDto, userId?: string) {
    const client = await this.clients.findOneAndUpdate({ _id: id, orgId }, this.normalize(dto), { new: true }).exec();
    if (!client) throw new NotFoundException('Client not found');
    await this.audit.log({
      action: 'client.updated', orgId, userId, resourceId: id, meta: { name: client.name },
    });
    return client;
  }

  async remove(orgId: string, id: string, userId?: string): Promise<void> {
    const doc = await this.findOneScoped(orgId, id);
    await this.clients.deleteOne({ _id: id, orgId }).exec();
    await this.audit.log({
      action: 'client.deleted', orgId, userId, resourceId: id, meta: { name: doc.name },
    });
  }
}
