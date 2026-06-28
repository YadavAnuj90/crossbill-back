import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Onboarding, OnboardingSchema } from './schemas/onboarding.schema';
import { Exit, ExitSchema } from './schemas/exit.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { LifecycleService } from './lifecycle.service';
import { LifecycleController } from './lifecycle.controller';
import { EmployeesModule } from '../employees/employees.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Onboarding.name, schema: OnboardingSchema },
      { name: Exit.name, schema: ExitSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    EmployeesModule,
    AuditModule,
  ],
  providers: [LifecycleService],
  controllers: [LifecycleController],
  exports: [LifecycleService],
})
export class LifecycleModule {}
