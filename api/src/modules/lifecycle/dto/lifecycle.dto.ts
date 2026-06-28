import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsIn, IsISO8601, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested,
} from 'class-validator';

// ── Onboarding ──
export class ToggleChecklistDto {
  @ApiProperty() @IsBoolean() done: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(600) docUrl?: string;
}

// ── Exit ──
export class CreateExitDto {
  @ApiProperty() @IsMongoId() employeeId: string;
  @ApiProperty({ description: 'ISO date of resignation' }) @IsISO8601() resignationDate: string;
  @ApiPropertyOptional({ default: 30 }) @IsOptional() @IsInt() @Min(0) noticeDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class AssetDto {
  @ApiProperty() @IsString() @MaxLength(120) asset: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() returned?: boolean;
}

export class UpdateExitDto {
  @ApiPropertyOptional({ type: [AssetDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AssetDto)
  assets?: AssetDto[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() managerApproved?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hrApproved?: boolean;
  @ApiPropertyOptional({ example: '85000.00' }) @IsOptional() @Matches(/^\d{1,12}(\.\d{1,2})?$/) finalSettlement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(600) settlementNotes?: string;
  @ApiPropertyOptional({ description: 'ISO last working day' }) @IsOptional() @IsISO8601() lastWorkingDate?: string;
  @ApiPropertyOptional({ enum: ['initiated', 'notice', 'cleared', 'settled'] }) @IsOptional() @IsIn(['initiated', 'notice', 'cleared', 'settled']) status?: string;
}

// ── Exit list filters (additive; keeps the array response shape) ──
export class ExitListQueryDto {
  @ApiPropertyOptional({ enum: ['initiated', 'notice', 'cleared', 'settled'] })
  @IsOptional() @IsIn(['initiated', 'notice', 'cleared', 'settled']) status?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive employee name search' })
  @IsOptional() @IsString() @MaxLength(120) q?: string;
}
