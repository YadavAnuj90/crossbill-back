import { IsEmail, IsEnum, IsIn, IsOptional, IsString, Length, Matches, ValidateIf } from 'class-validator';
import { VALID_STATE_CODES } from '../../../common/constants/india-states';

export class CreateClientDto {
  @IsIn(['foreign', 'domestic'])
  type: 'foreign' | 'domestic';

  @IsString()
  name: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  address?: string;

  // Foreign
  @ValidateIf((o) => o.type === 'foreign')
  @IsString() @Length(2, 2, { message: 'country must be a 2-letter ISO code' })
  country?: string;

  // Domestic
  @ValidateIf((o) => o.type === 'domestic')
  @IsIn([...VALID_STATE_CODES], { message: 'stateCode must be a valid GST state code' })
  stateCode?: string;

  @ValidateIf((o) => o.type === 'domestic')
  @IsEnum(['b2b', 'b2c'] as any, { message: 'customerType must be b2b or b2c' })
  customerType?: 'b2b' | 'b2c';

  // GSTIN required only for domestic B2B
  @ValidateIf((o) => o.type === 'domestic' && o.customerType === 'b2b')
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'gstin must be a valid 15-character GSTIN',
  })
  gstin?: string;
}
