import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SetLifecycleDto {
  @ApiPropertyOptional({ description: 'When the contract takes effect (ISO date)' })
  @IsOptional() @IsISO8601()
  effectiveDate?: string;

  @ApiPropertyOptional({ description: 'Auto-renewal date (ISO date)' })
  @IsOptional() @IsISO8601()
  renewalDate?: string;

  @ApiPropertyOptional({ description: 'Expiry / end date (ISO date)' })
  @IsOptional() @IsISO8601()
  expiryDate?: string;
}

export class AddObligationDto {
  @ApiPropertyOptional({ description: 'What needs to be done' })
  @IsString() @MinLength(1) @MaxLength(300)
  title: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(120)
  owner?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO date)' })
  @IsOptional() @IsISO8601()
  dueDate?: string;
}
