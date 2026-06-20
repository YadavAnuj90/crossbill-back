import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { RazorpayClient } from './clients/razorpay.client';
import { InvoicesModule } from '../invoices/invoices.module';
import { ClientsModule } from '../clients/clients.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    InvoicesModule,
    ClientsModule,
    OrganizationsModule,
    AuditModule,
  ],
  providers: [PaymentsService, RazorpayClient],
  controllers: [PaymentsController],
  exports: [PaymentsService, RazorpayClient],
})
export class PaymentsModule {}
