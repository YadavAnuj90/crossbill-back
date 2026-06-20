import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail, IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength,
} from 'class-validator';

export const EMPLOYMENT_TYPES = ['full_time', 'contract', 'intern'] as const;
export const EMPLOYEE_STATUSES = ['onboarding', 'active', 'on_notice', 'exited'] as const;

export class CreateEmployeeDto {
  @ApiProperty({ example: 'EMP-001' })
  @IsString() @MinLength(1) @MaxLength(40)
  empCode: string;

  @ApiProperty({ example: 'Anita' })
  @IsString() @MinLength(1) @MaxLength(80)
  firstName: string;

  @ApiPropertyOptional({ example: 'Rao' })
  @IsOptional() @IsString() @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(20)
  mobile?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(80)
  department?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(80)
  designation?: string;

  @ApiPropertyOptional({ description: 'ISO date' })
  @IsOptional() @IsISO8601()
  joiningDate?: string;

  @ApiPropertyOptional({ enum: EMPLOYEE_STATUSES })
  @IsOptional() @IsIn(EMPLOYEE_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES })
  @IsOptional() @IsIn(EMPLOYMENT_TYPES)
  employmentType?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(120)
  reportingManager?: string;

  @ApiPropertyOptional({ example: '1200000.00' })
  @IsOptional() @IsString() @MaxLength(20)
  ctcAnnual?: string;

  @ApiPropertyOptional({ description: 'ISO date of birth' })
  @IsOptional() @IsISO8601()
  dob?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(400)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(120)
  emergencyContact?: string;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
