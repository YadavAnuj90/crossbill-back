import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PaginationDto, Paginated } from '../../common/dto/pagination.dto';

/**
 * All queries are scoped by orgId (design §10 multi-tenancy guardrail) — orgId always comes
 * from the authenticated principal, never from client-supplied input.
 */
@Injectable()
export class ClientsService {
  constructor(@InjectModel(Client.name) private readonly clients: Model<ClientDocument>) {}

  create(orgId: string, dto: CreateClientDto) {
    return this.clients.create({ ...dto, country: dto.country.toUpperCase(), orgId });
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

  async update(orgId: string, id: string, dto: UpdateClientDto) {
    const patch: any = { ...dto };
    if (dto.country) patch.country = dto.country.toUpperCase();
    const client = await this.clients.findOneAndUpdate({ _id: id, orgId }, patch, { new: true }).exec();
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async remove(orgId: string, id: string): Promise<void> {
    const res = await this.clients.deleteOne({ _id: id, orgId }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Client not found');
  }
}
