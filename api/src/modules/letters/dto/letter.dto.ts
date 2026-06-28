import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsMongoId, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const LETTER_KINDS = ['offer', 'experience', 'relieving'] as const;
export const LETTER_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;
/** Statuses a client may request via the status-change endpoint (draft is set on create only). */
export const LETTER_DECISION_STATUSES = ['sent', 'accepted', 'rejected', 'expired'] as const;

/** Money amount: digits with optional 2-decimal fraction, e.g. "1200000.00". */
const MONEY_REGEX = /^\d{1,12}(\.\d{1,2})?$/;

export class CreateLetterDto {
  @ApiProperty()
  @IsMongoId()
  employeeId: string;

  @ApiProperty({ enum: LETTER_KINDS })
  @IsIn(LETTER_KINDS)
  kind: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) designation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) department?: string;
  @ApiPropertyOptional({ description: 'ISO date' }) @IsOptional() @IsISO8601() joiningDate?: string;
  @ApiPropertyOptional({ example: '1200000.00' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(MONEY_REGEX, { message: 'ctc must be a money amount like "1200000.00"' })
  ctc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) reportingManager?: string;
  @ApiPropertyOptional({ description: 'Employment start (experience letter)' }) @IsOptional() @IsISO8601() fromDate?: string;
  @ApiPropertyOptional({ description: 'Last working day (experience/relieving)' }) @IsOptional() @IsISO8601() toDate?: string;
}

export class LetterDecisionDto {
  @ApiProperty({ enum: LETTER_DECISION_STATUSES })
  @IsIn(LETTER_DECISION_STATUSES)
  status: (typeof LETTER_DECISION_STATUSES)[number];
}

/** Optional, additive filters for the list endpoint. */
export class ListLettersQueryDto {
  @ApiPropertyOptional({ enum: LETTER_KINDS })
  @IsOptional()
  @IsIn(LETTER_KINDS)
  kind?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  employeeId?: string;

  @ApiPropertyOptional({ enum: LETTER_STATUSES })
  @IsOptional()
  @IsIn(LETTER_STATUSES)
  status?: string;
}
