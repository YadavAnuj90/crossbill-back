import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Remittance, RemittanceSchema } from './schemas/remittance.schema';
import { DocumentMeta, DocumentMetaSchema } from '../audit/schemas/document-meta.schema';
import { RemittancesService } from './remittances.service';
import { RemittancesController } from './remittances.controller';
import { FircStorageService } from './services/firc-storage.service';
import { InvoicesModule } from '../invoices/invoices.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Remittance.name, schema: RemittanceSchema },
      { name: DocumentMeta.name, schema: DocumentMetaSchema },
    ]),
    InvoicesModule,
    AuditModule,
  ],
  providers: [RemittancesService, FircStorageService],
  controllers: [RemittancesController],
  exports: [RemittancesService],
})
export class RemittancesModule {}
