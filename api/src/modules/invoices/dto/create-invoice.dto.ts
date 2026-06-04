import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID,
  Min, ValidateNested, IsNumber,
} from 'class-validator';
import { VALID_SAC_CODES } from '../../../common/constants/sac-codes';

export class InvoiceItemDto {
  @IsString()
  description: string;

  @IsOptional() @IsIn([...VALID_SAC_CODES], { message: 'sacCode must be a known SAC code' })
  sacCode?: string;

  @IsNumber() @Min(0)
  quantity: number;

  @IsNumber() @Min(0)
  unitAmount: number;
}

export class CreateInvoiceDto {
  @IsString()
  clientId: string;

  @IsOptional() @IsDateString()
  invoiceDate?: string;

  @IsIn(['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED'])
  currency: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
