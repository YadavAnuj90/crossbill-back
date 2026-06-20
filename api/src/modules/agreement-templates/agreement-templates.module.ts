import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgreementTemplate, AgreementTemplateSchema } from './schemas/agreement-template.schema';
import { AgreementTemplatesService } from './agreement-templates.service';
import { AgreementTemplatesController } from './agreement-templates.controller';
import { AgreementsModule } from '../agreements/agreements.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AgreementTemplate.name, schema: AgreementTemplateSchema }]),
    AgreementsModule,
    AuditModule,
  ],
  providers: [AgreementTemplatesService],
  controllers: [AgreementTemplatesController],
  exports: [AgreementTemplatesService],
})
export class AgreementTemplatesModule {}
