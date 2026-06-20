import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsEmail, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateNested,
} from 'class-validator';

export const TEMPLATE_CATEGORIES = ['nda', 'msa', 'sow', 'engagement', 'custom'] as const;

export class CreateTemplateDto {
  @ApiProperty({ example: 'Standard NDA' })
  @IsString() @MinLength(2) @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ enum: TEMPLATE_CATEGORIES, default: 'custom' })
  @IsOptional() @IsIn(TEMPLATE_CATEGORIES)
  category?: string;

  @ApiProperty({ description: 'Body with optional {{merge_fields}}' })
  @IsString() @MaxLength(100_000)
  body: string;
}

export class CreateFromTemplateDto {
  @ApiPropertyOptional({ description: 'Override the generated title' })
  @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Client this agreement is with' })
  @IsOptional() @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Values to substitute into {{fields}}', type: Object })
  @IsOptional() @IsObject()
  values?: Record<string, string>;
}

export class BulkRecipientDto {
  @ApiProperty({ example: 'Anita Rao' })
  @IsString() @MinLength(2)
  signerName: string;

  @ApiProperty({ example: 'anita@foo.com' })
  @IsEmail()
  signerEmail: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional() @IsObject()
  values?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  title?: string;
}

export class BulkSendDto {
  @ApiProperty({ type: [BulkRecipientDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => BulkRecipientDto)
  recipients: BulkRecipientDto[];
}
