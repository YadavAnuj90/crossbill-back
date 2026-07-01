import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsDateString, IsIn, IsMongoId, IsOptional, IsString,
  Min, ValidateNested, IsNumber,
} from 'class-validator';
import { VALID_SAC_CODES } from '../../../common/constants/sac-codes';
import { GST_RATES } from '../../../common/constants/gst';

export class InvoiceItemDto {
  @ApiProperty({ description: 'Line item description', example: 'Software development services - June 2026' })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'SAC (Services Accounting Code)',
    enum: [...VALID_SAC_CODES],
    example: '998314',
  })
  @IsOptional() @IsIn([...VALID_SAC_CODES], { message: 'sacCode must be a known SAC code' })
  sacCode?: string;

  @ApiProperty({ description: 'Quantity', example: 1, minimum: 0 })
  @IsNumber() @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Unit amount in the invoice currency', example: 5000, minimum: 0 })
  @IsNumber() @Min(0)
  unitAmount: number;

  @ApiPropertyOptional({
    description: 'GST rate % (domestic only). Ignored for export invoices.',
    enum: GST_RATES as unknown as number[],
    example: 18,
  })
  @IsOptional() @IsIn(GST_RATES as unknown as number[], { message: 'gstRate must be one of 0/5/12/18/28' })
  gstRate?: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Id of an existing client to bill', example: '665f1b2c9a4e1c0012ab34cd' })
  @IsMongoId()
  clientId: string;

  @ApiPropertyOptional({
    description: 'Invoice date (ISO 8601). Defaults to today when omitted.',
    format: 'date',
    example: '2026-06-12',
  })
  @IsOptional() @IsDateString()
  invoiceDate?: string;

  @ApiPropertyOptional({
    description: 'Invoice currency. Required for export; domestic invoices are forced to INR by the server.',
    enum: ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'INR'],
    example: 'USD',
  })
  @IsOptional() @IsIn(['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'INR'])
  currency?: string;

  @ApiProperty({
    description: 'At least one line item',
    type: [InvoiceItemDto],
    minItems: 1,
  })
  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
