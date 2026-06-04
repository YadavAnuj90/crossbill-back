import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { VALID_SAC_CODES } from '../../../common/constants/sac-codes';

/** Business profile fields needed to produce compliant export invoices (design §5, §8). */
export class UpdateProfileDto {
  @IsOptional() @IsString()
  legalName?: string;

  @IsOptional()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
    message: 'gstin must be a valid 15-character GSTIN',
  })
  gstin?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsIn([...VALID_SAC_CODES], { message: 'defaultSac must be a known SAC code' })
  defaultSac?: string;

  @IsOptional() @IsString()
  bankAccount?: string;

  @IsOptional() @IsString() @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'bankIfsc must be a valid IFSC' })
  bankIfsc?: string;

  @IsOptional() @IsString()
  lutNumber?: string;

  @IsOptional() @IsString() @Length(7, 7, { message: 'lutFy must look like 2026-27' })
  lutFy?: string;

  @IsOptional() @IsString()
  lutArn?: string;
}
