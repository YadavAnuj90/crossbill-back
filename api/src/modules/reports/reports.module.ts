import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PdfProcessor } from './processors/pdf.processor';
import { PdfServiceClient } from './clients/pdf-service.client';
import { InvoicesModule } from '../invoices/invoices.module';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { RemittancesModule } from '../remittances/remittances.module';
import { QUEUES } from '../../queue/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.PDF }),
    InvoicesModule,
    ClientsModule,
    UsersModule,
    AuditModule,
    RemittancesModule,
  ],
  providers: [ReportsService, PdfServiceClient, PdfProcessor],
  controllers: [ReportsController],
  exports: [ReportsService, PdfServiceClient],
})
export class ReportsModule {}
