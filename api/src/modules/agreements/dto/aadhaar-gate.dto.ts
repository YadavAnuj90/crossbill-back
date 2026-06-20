import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class AadhaarInitDto {
  @ApiProperty({ example: '999999990019', description: '12-digit Aadhaar number' })
  @IsString() @Matches(/^\d{12}$/, { message: 'Enter a valid 12-digit Aadhaar number' })
  aadhaar: string;
}

export class AadhaarVerifyDto {
  @ApiProperty()
  @IsString() @MinLength(4)
  referenceId: string;

  @ApiProperty({ example: '123456' })
  @IsString() @Matches(/^\d{4,8}$/, { message: 'Enter the OTP' })
  otp: string;
}
