import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const CONSENT_BASES = ['consent', 'contract', 'legal_obligation', 'legitimate_use'] as const;

export class CreateConsentDto {
  @ApiPropertyOptional({ description: 'Client this consent relates to' })
  @IsOptional() @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Name/email of the data principal if not a stored client' })
  @IsOptional() @IsString() @MaxLength(200)
  dataPrincipal?: string;

  @ApiProperty({ example: 'Invoicing & GST/FEMA compliance' })
  @IsString() @MinLength(2) @MaxLength(300)
  purpose: string;

  @ApiPropertyOptional({ enum: CONSENT_BASES, default: 'consent' })
  @IsOptional() @IsIn(CONSENT_BASES)
  basis?: string;

  @ApiPropertyOptional({ description: 'ISO date the consent/basis expires' })
  @IsOptional() @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}
