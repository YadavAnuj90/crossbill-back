import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { Counter, CounterSchema } from './schemas/counter.schema';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { InvoiceNumberService } from './services/invoice-number.service';
import { ExchangeRateService } from './services/exchange-rate.service';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';
import { QUEUES } from '../../queue/queue.constants';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    BullModule.registerQueue({ name: QUEUES.PDF }),
    ClientsModule,
    UsersModule,
  ],
  providers: [InvoicesService, InvoiceNumberService, ExchangeRateService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
