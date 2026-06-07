import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VALID_PURPOSE_CODES } from '../../../common/constants/purpose-codes';

export class CreateRemittanceDto {
  @IsString()
  invoiceId: string;

  @Type(() => Number) @IsNumber() @Min(0)
  amountReceived: number;

  @IsString()
  currency: string;

  @IsDateString()
  receivedDate: string;

  @IsIn([...VALID_PURPOSE_CODES], { message: 'purposeCode must be a valid RBI purpose code' })
  purposeCode: string;

  @IsOptional() @IsString()
  notes?: string;
}
