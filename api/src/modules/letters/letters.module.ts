import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HrLetter, HrLetterSchema } from './schemas/hr-letter.schema';
import { LettersService } from './letters.service';
import { LettersController } from './letters.controller';
import { PdfServiceClient } from '../reports/clients/pdf-service.client';
import { EmployeesModule } from '../employees/employees.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HrLetter.name, schema: HrLetterSchema }]),
    EmployeesModule,
    OrganizationsModule,
    AuditModule,
  ],
  providers: [LettersService, PdfServiceClient],
  controllers: [LettersController],
  exports: [LettersService],
})
export class LettersModule {}
