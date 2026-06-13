import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { VALID_SAC_CODES } from '../../../common/constants/sac-codes';
import { GST_RATES } from '../../../common/constants/gst';

export class NoteItemDto {
  @IsString() description: string;
  @IsOptional() @IsIn([...VALID_SAC_CODES], { message: 'sacCode must be a known SAC code' }) sacCode?: string;
  @IsNumber() @Min(0) quantity: number;
  @IsNumber() @Min(0) unitAmount: number;
  @IsOptional() @IsIn(GST_RATES as unknown as number[], { message: 'gstRate must be one of 0/5/12/18/28' }) gstRate?: number;
}

export class CreateNoteDto {
  @IsString() invoiceId: string;

  @IsIn(['credit', 'debit']) kind: 'credit' | 'debit';

  @IsString() reason: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NoteItemDto)
  items: NoteItemDto[];
}
