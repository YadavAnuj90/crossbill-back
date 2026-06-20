import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PaymentsModule } from '../payments/payments.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PaymentsModule, OrganizationsModule, UsersModule],
  providers: [BillingService],
  controllers: [BillingController],
})
export class BillingModule {}
