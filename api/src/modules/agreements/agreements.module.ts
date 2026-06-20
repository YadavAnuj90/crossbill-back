import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Agreement, AgreementSchema } from './schemas/agreement.schema';
import { AgreementsService } from './agreements.service';
import { AgreementsController } from './agreements.controller';
import { PdfServiceClient } from '../reports/clients/pdf-service.client';
import { EsignProviderClient } from './clients/esign-provider.client';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AadhaarModule } from '../aadhaar/aadhaar.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Agreement.name, schema: AgreementSchema }]),
    ClientsModule,
    UsersModule,
    NotificationsModule,
    AuditModule,
    OrganizationsModule,
    AadhaarModule,
  ],
  providers: [AgreementsService, PdfServiceClient, EsignProviderClient],
  controllers: [AgreementsController],
  exports: [AgreementsService],
})
export class AgreementsModule {}
