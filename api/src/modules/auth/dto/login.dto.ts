import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Account email address',
    format: 'email',
    example: 'founder@acme.in',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Account password',
    example: 'S3curePass!',
    minLength: 8,
  })
  @IsString()
  password: string;
}
