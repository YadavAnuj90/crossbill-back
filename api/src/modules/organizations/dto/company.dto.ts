import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCompanyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) name?: string;
  @ApiPropertyOptional({ example: '27ABCDE1234F1Z5' }) @IsOptional() @IsString() @MaxLength(20) gstin?: string;
  @ApiPropertyOptional({ example: 'ABCDE1234F' }) @IsOptional() @IsString() @MaxLength(15) pan?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(600) registeredAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(600) logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) ownerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() ownerEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) ownerMobile?: string;
}

export class SetVerificationDto {
  @ApiPropertyOptional({ enum: ['verified', 'rejected'] })
  @IsIn(['verified', 'rejected'])
  status: 'verified' | 'rejected';

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(600)
  notes?: string;
}
