import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsMongoId, IsOptional, Matches } from 'class-validator';

const MONEY = /^\d{1,12}(\.\d{1,2})?$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const SLIP_STATUSES = ['draft', 'finalised', 'shared'] as const;
const RUN_STATUSES = ['draft', 'finalised'] as const;

export class CreateSlipDto {
  @ApiProperty()
  @IsMongoId()
  employeeId: string;

  @ApiProperty({ example: '2026-06', description: 'Pay month (YYYY-MM)' })
  @Matches(MONTH, { message: 'month must be YYYY-MM' })
  month: string;

  @ApiPropertyOptional({ example: '50000.00' }) @IsOptional() @Matches(MONEY) basic?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(MONEY) hra?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(MONEY) bonus?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(MONEY) allowances?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(MONEY) pf?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(MONEY) esic?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(MONEY) tds?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(MONEY) otherDeductions?: string;
}

/** Updates may not change identity (employee/month); only money components. */
export class UpdateSlipDto extends PartialType(CreateSlipDto) {
  @ApiPropertyOptional({ enum: SLIP_STATUSES })
  @IsOptional()
  @IsIn(SLIP_STATUSES as unknown as string[])
  status?: string;
}

export class RunPayrollDto {
  @ApiProperty({ example: '2026-06' })
  @Matches(MONTH, { message: 'period must be YYYY-MM' })
  period: string;
}

/** Additive read filters for GET /payroll/slips. */
export class ListSlipsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsMongoId() employeeId?: string;
  @ApiPropertyOptional({ example: '2026-06' }) @IsOptional() @Matches(MONTH) month?: string;
  @ApiPropertyOptional({ enum: SLIP_STATUSES })
  @IsOptional()
  @IsIn(SLIP_STATUSES as unknown as string[])
  status?: string;
}

/** Additive read filters for GET /payroll/runs. */
export class ListRunsQueryDto {
  @ApiPropertyOptional({ example: '2026-06' }) @IsOptional() @Matches(MONTH) month?: string;
  @ApiPropertyOptional({ enum: RUN_STATUSES })
  @IsOptional()
  @IsIn(RUN_STATUSES as unknown as string[])
  status?: string;
}
