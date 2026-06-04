import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PaginationDto, Paginated } from '../../common/dto/pagination.dto';

/**
 * All queries are scoped by org_id (design §10 multi-tenancy guardrail) — the orgId is
 * always taken from the authenticated principal, never from client-supplied input.
 */
@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clients: Repository<Client>,
  ) {}

  create(orgId: string, dto: CreateClientDto): Promise<Client> {
    const client = this.clients.create({ ...dto, country: dto.country.toUpperCase(), orgId });
    return this.clients.save(client);
  }

  async list(orgId: string, page: PaginationDto): Promise<Paginated<Client>> {
    const [items, total] = await this.clients.findAndCount({
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

  async findOneScoped(orgId: string, id: string): Promise<Client> {
    const client = await this.clients.findOne({ where: { id, orgId } });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(orgId: string, id: string, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOneScoped(orgId, id);
    Object.assign(client, dto, dto.country ? { country: dto.country.toUpperCase() } : {});
    return this.clients.save(client);
  }

  async remove(orgId: string, id: string): Promise<void> {
    const client = await this.findOneScoped(orgId, id);
    await this.clients.remove(client);
  }
}
