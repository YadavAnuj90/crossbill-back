import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsIn, IsOptional, IsString, Length, Matches, ValidateIf } from 'class-validator';
import { VALID_STATE_CODES } from '../../../common/constants/india-states';

export class CreateClientDto {
  @ApiProperty({
    description: 'Client type. `foreign` requires `country`; `domestic` requires `stateCode` and `customerType`.',
    enum: ['foreign', 'domestic'],
    example: 'foreign',
  })
  @IsIn(['foreign', 'domestic'])
  type: 'foreign' | 'domestic';

  @ApiProperty({ description: 'Client / company name', example: 'Globex Corporation' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Client billing email',
    format: 'email',
    example: 'ap@globex.com',
  })
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Postal address', example: '1 Market St, San Francisco, CA' })
  @IsOptional() @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Foreign clients only — 2-letter ISO country code',
    example: 'US',
    minLength: 2,
    maxLength: 2,
  })
  @ValidateIf((o) => o.type === 'foreign')
  @IsString() @Length(2, 2, { message: 'country must be a 2-letter ISO code' })
  country?: string;

  @ApiPropertyOptional({
    description: 'Domestic clients only — GST state code',
    enum: [...VALID_STATE_CODES],
    example: '27',
  })
  @ValidateIf((o) => o.type === 'domestic')
  @IsIn([...VALID_STATE_CODES], { message: 'stateCode must be a valid GST state code' })
  stateCode?: string;

  @ApiPropertyOptional({
    description: 'Domestic clients only — B2B (registered) or B2C (unregistered)',
    enum: ['b2b', 'b2c'],
    example: 'b2b',
  })
  @ValidateIf((o) => o.type === 'domestic')
  @IsEnum(['b2b', 'b2c'] as any, { message: 'customerType must be b2b or b2c' })
  customerType?: 'b2b' | 'b2c';

  @ApiPropertyOptional({
    description: 'Required for domestic B2B clients — 15-character GSTIN',
    example: '27AAPFU0939F1ZV',
    pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
  })
  @ValidateIf((o) => o.type === 'domestic' && o.customerType === 'b2b')
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'gstin must be a valid 15-character GSTIN',
  })
  gstin?: string;
}
