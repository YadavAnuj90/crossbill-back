import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString,
  Min, ValidateNested, IsNumber,
} from 'class-validator';
import { VALID_SAC_CODES } from '../../../common/constants/sac-codes';
import { GST_RATES } from '../../../common/constants/gst';

export class InvoiceItemDto {
  @IsString()
  description: string;

  @IsOptional() @IsIn([...VALID_SAC_CODES], { message: 'sacCode must be a known SAC code' })
  sacCode?: string;

  @IsNumber() @Min(0)
  quantity: number;

  @IsNumber() @Min(0)
  unitAmount: number;

  /** GST rate % (domestic only). Ignored for export invoices. */
  @IsOptional() @IsIn(GST_RATES as unknown as number[], { message: 'gstRate must be one of 0/5/12/18/28' })
  gstRate?: number;
}

export class CreateInvoiceDto {
  @IsString()
  clientId: string;

  @IsOptional() @IsDateString()
  invoiceDate?: string;

  /** Required for export; for domestic the server forces INR. */
  @IsOptional() @IsIn(['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'INR'])
  currency?: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
