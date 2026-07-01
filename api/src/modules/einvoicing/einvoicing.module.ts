import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { EInvoice, EInvoiceSchema } from './schemas/einvoice.schema';
import { EInvoicingService } from './einvoicing.service';
import { EInvoicingController } from './einvoicing.controller';
import { SandboxEInvoiceProvider } from './providers/sandbox-einvoice.provider';
import { EINVOICE_PROVIDER } from './providers/einvoice-provider.interface';
import { InvoicesModule } from '../invoices/invoices.module';
import { ClientsModule } from '../clients/clients.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EInvoice.name, schema: EInvoiceSchema }]),
    InvoicesModule,
    ClientsModule,
    OrganizationsModule,
    AuditModule,
  ],
  providers: [
    EInvoicingService,
    SandboxEInvoiceProvider,
    {
      // Select a licensed GSP by config; fall back to the built-in sandbox.
      provide: EINVOICE_PROVIDER,
      inject: [ConfigService, SandboxEInvoiceProvider],
      useFactory: (_config: ConfigService, sandbox: SandboxEInvoiceProvider) => {
        // const provider = _config.get<string>('einvoicing.provider');
        // if (provider === 'mastergst') return new MasterGstProvider(_config);
        return sandbox;
      },
    },
  ],
  controllers: [EInvoicingController],
  exports: [EInvoicingService],
})
export class EInvoicingModule {}
