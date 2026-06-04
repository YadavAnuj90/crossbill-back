import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgs: Repository<Organization>,
  ) {}

  /** Creates a personal org for a new user; the user becomes its OWNER. */
  async createForOwner(name: string): Promise<Organization> {
    const org = this.orgs.create({ name, plan: 'free' });
    return this.orgs.save(org);
  }

  findById(id: string) {
    return this.orgs.findOne({ where: { id } });
  }

  async setOwner(orgId: string, ownerId: string) {
    await this.orgs.update({ id: orgId }, { ownerId });
  }
}
