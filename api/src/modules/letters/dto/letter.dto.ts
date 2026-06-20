import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export const LETTER_KINDS = ['offer', 'experience', 'relieving'] as const;

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
  @ApiPropertyOptional({ example: '1200000.00' }) @IsOptional() @IsString() @MaxLength(20) ctc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) reportingManager?: string;
  @ApiPropertyOptional({ description: 'Employment start (experience letter)' }) @IsOptional() @IsISO8601() fromDate?: string;
  @ApiPropertyOptional({ description: 'Last working day (experience/relieving)' }) @IsOptional() @IsISO8601() toDate?: string;
}

export class LetterDecisionDto {
  @ApiProperty({ enum: ['sent', 'accepted', 'rejected', 'expired'] })
  @IsIn(['sent', 'accepted', 'rejected', 'expired'])
  status: 'sent' | 'accepted' | 'rejected' | 'expired';
}
