import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SendAgreementDto {
  @ApiProperty({ example: 'Anita Rao' })
  @IsString() @MinLength(2)
  signerName: string;

  @ApiProperty({ example: 'anita@foo.com' })
  @IsEmail()
  signerEmail: string;

  @ApiPropertyOptional({ description: 'Require Aadhaar OTP verification before the signer can open & sign' })
  @IsOptional() @IsBoolean()
  aadhaarRequired?: boolean;
}
