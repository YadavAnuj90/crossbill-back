import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Organization, OrganizationDocument } from './schemas/organization.schema';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name) private readonly orgs: Model<OrganizationDocument>,
  ) {}

  /** Creates a personal org for a new user; the user becomes its OWNER. */
  createForOwner(name: string) {
    return this.orgs.create({ name, plan: 'free' });
  }

  findById(id: string) {
    return this.orgs.findById(id).exec();
  }

  async setOwner(orgId: string, ownerId: string) {
    await this.orgs.findByIdAndUpdate(orgId, { ownerId }).exec();
  }
}
