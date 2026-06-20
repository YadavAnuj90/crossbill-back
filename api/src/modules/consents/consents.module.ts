import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Consent, ConsentSchema } from './schemas/consent.schema';
import { ConsentsService } from './consents.service';
import { ConsentsController } from './consents.controller';
import { ClientsModule } from '../clients/clients.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Consent.name, schema: ConsentSchema }]),
    ClientsModule,
    AuditModule,
  ],
  providers: [ConsentsService],
  controllers: [ConsentsController],
  exports: [ConsentsService],
})
export class ConsentsModule {}
