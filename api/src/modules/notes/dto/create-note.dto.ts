import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsIn, IsMongoId, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { VALID_SAC_CODES } from '../../../common/constants/sac-codes';
import { GST_RATES } from '../../../common/constants/gst';

export class NoteItemDto {
  @IsString() @MaxLength(300) description: string;
  @IsOptional() @IsIn([...VALID_SAC_CODES], { message: 'sacCode must be a known SAC code' }) sacCode?: string;
  @IsNumber() @Min(0) @Max(1_000_000_000) quantity: number;
  @IsNumber() @Min(0) @Max(1_000_000_000) unitAmount: number;
  @IsOptional() @IsIn(GST_RATES as unknown as number[], { message: 'gstRate must be one of 0/5/12/18/28' }) gstRate?: number;
}

export class CreateNoteDto {
  @IsMongoId() invoiceId: string;

  @IsIn(['credit', 'debit']) kind: 'credit' | 'debit';

  @IsString() @MaxLength(500) reason: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NoteItemDto)
  items: NoteItemDto[];
}
