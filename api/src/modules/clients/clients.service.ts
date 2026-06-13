import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PaginationDto, Paginated } from '../../common/dto/pagination.dto';

/** All queries are scoped by orgId (design §10). Supports foreign (export) + domestic (GST) clients. */
@Injectable()
export class ClientsService {
  constructor(@InjectModel(Client.name) private readonly clients: Model<ClientDocument>) {}

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

  create(orgId: string, dto: CreateClientDto) {
    return this.clients.create({ ...this.normalize(dto), orgId });
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

  async update(orgId: string, id: string, dto: UpdateClientDto) {
    const client = await this.clients.findOneAndUpdate({ _id: id, orgId }, this.normalize(dto), { new: true }).exec();
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async remove(orgId: string, id: string): Promise<void> {
    const res = await this.clients.deleteOne({ _id: id, orgId }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Client not found');
  }
}
