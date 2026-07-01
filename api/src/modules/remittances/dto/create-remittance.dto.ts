import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsMongoId, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VALID_PURPOSE_CODES } from '../../../common/constants/purpose-codes';

export class CreateRemittanceDto {
  @ApiProperty({ description: 'Id of the invoice this remittance settles', example: '665f1b2c9a4e1c0012ab34cd' })
  @IsMongoId()
  invoiceId: string;

  @ApiProperty({ description: 'Amount received in the remittance currency', example: 5000, minimum: 0 })
  @Type(() => Number) @IsNumber() @Min(0.01) @Max(1_000_000_000_000)
  amountReceived: number;

  @ApiProperty({ description: 'Currency of the received amount (ISO 4217)', example: 'USD' })
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter ISO 4217 code (e.g. USD)' })
  currency: string;

  @ApiProperty({ description: 'Date the funds were received (ISO 8601)', format: 'date', example: '2026-06-10' })
  @IsDateString()
  receivedDate: string;

  @ApiProperty({
    description: 'RBI purpose code for the inward remittance',
    enum: [...VALID_PURPOSE_CODES],
    example: 'P0802',
  })
  @IsIn([...VALID_PURPOSE_CODES], { message: 'purposeCode must be a valid RBI purpose code' })
  purposeCode: string;

  @ApiPropertyOptional({ description: 'Free-text notes', example: 'Partial payment against INV-2026-0007' })
  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}
