import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { VALID_SAC_CODES } from '../../../common/constants/sac-codes';

/** Business profile fields needed to produce compliant export invoices (design §5, §8). */
export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Registered legal/business name', example: 'Acme Software Exports Pvt Ltd' })
  @IsOptional() @IsString()
  legalName?: string;

  @ApiPropertyOptional({
    description: '15-character GSTIN',
    example: '27AAPFU0939F1ZV',
    pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
  })
  @IsOptional()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'gstin must be a valid 15-character GSTIN',
  })
  gstin?: string;

  @ApiPropertyOptional({ description: 'Registered business address', example: 'Unit 4, Tech Park, Pune 411057' })
  @IsOptional() @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Default SAC code applied to invoice items', enum: [...VALID_SAC_CODES], example: '998314' })
  @IsOptional() @IsIn([...VALID_SAC_CODES], { message: 'defaultSac must be a known SAC code' })
  defaultSac?: string;

  @ApiPropertyOptional({ description: 'Bank account number for remittances', example: '50100123456789' })
  @IsOptional() @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({
    description: 'Bank IFSC code',
    example: 'HDFC0001234',
    pattern: '^[A-Z]{4}0[A-Z0-9]{6}$',
  })
  @IsOptional() @IsString() @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'bankIfsc must be a valid IFSC' })
  bankIfsc?: string;

  @ApiPropertyOptional({ description: 'LUT (Letter of Undertaking) number for zero-rated exports', example: 'AD2701260012345' })
  @IsOptional() @IsString()
  lutNumber?: string;

  @ApiPropertyOptional({ description: 'LUT financial year in `YYYY-YY` form', example: '2026-27', minLength: 7, maxLength: 7 })
  @IsOptional() @IsString() @Length(7, 7, { message: 'lutFy must look like 2026-27' })
  lutFy?: string;

  @ApiPropertyOptional({ description: 'LUT acknowledgement reference number (ARN)', example: 'AD270126001234A' })
  @IsOptional() @IsString()
  lutArn?: string;
}
