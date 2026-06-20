import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalarySlip, SalarySlipSchema } from './schemas/salary-slip.schema';
import { PayrollRun, PayrollRunSchema } from './schemas/payroll-run.schema';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PdfServiceClient } from '../reports/clients/pdf-service.client';
import { EmployeesModule } from '../employees/employees.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalarySlip.name, schema: SalarySlipSchema },
      { name: PayrollRun.name, schema: PayrollRunSchema },
    ]),
    EmployeesModule,
    OrganizationsModule,
    AuditModule,
  ],
  providers: [PayrollService, PdfServiceClient],
  controllers: [PayrollController],
  exports: [PayrollService],
})
export class PayrollModule {}
