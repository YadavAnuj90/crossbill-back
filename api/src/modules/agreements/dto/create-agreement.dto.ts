import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const AGREEMENT_CATEGORIES = ['nda', 'msa', 'sow', 'engagement', 'custom'] as const;

export class CreateAgreementDto {
  @ApiProperty({ example: 'Mutual NDA — Foo Inc.' })
  @IsString() @MinLength(2) @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ enum: AGREEMENT_CATEGORIES, default: 'custom' })
  @IsOptional() @IsIn(AGREEMENT_CATEGORIES)
  category?: string;

  @ApiPropertyOptional({ description: 'Plain-text / simple HTML body of the agreement' })
  @IsOptional() @IsString() @MaxLength(100_000)
  body?: string;

  @ApiPropertyOptional({ description: 'Client this agreement is with' })
  @IsOptional() @IsString()
  clientId?: string;
}
