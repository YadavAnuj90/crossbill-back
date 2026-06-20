import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { CompanyController } from './company.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Organization.name, schema: OrganizationSchema }])],
  providers: [OrganizationsService],
  controllers: [OrganizationsController, CompanyController],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
