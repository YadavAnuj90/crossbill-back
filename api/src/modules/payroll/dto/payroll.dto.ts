import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, Matches } from 'class-validator';

const MONEY = /^\d{1,12}(\.\d{1,2})?$/;

export class CreateSlipDto {
  @ApiProperty()
  @IsMongoId()
  employeeId: string;

  @ApiProperty({ example: '2026-06', description: 'Pay month (YYYY-MM)' })
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be YYYY-MM' })
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

export class RunPayrollDto {
  @ApiProperty({ example: '2026-06' })
  @Matches(/^\d{4}-\d{2}$/, { message: 'period must be YYYY-MM' })
  period: string;
}
