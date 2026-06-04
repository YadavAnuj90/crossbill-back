import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { InvoiceNumberService } from './services/invoice-number.service';
import { ExchangeRateService } from './services/exchange-rate.service';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';
import { QUEUES } from '../../queue/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceItem]),
    BullModule.registerQueue({ name: QUEUES.PDF }),
    ClientsModule,
    UsersModule,
  ],
  providers: [InvoicesService, InvoiceNumberService, ExchangeRateService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
