import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Email address to register the account under (must be unique)',
    format: 'email',
    example: 'founder@acme.in',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password, minimum 8 characters',
    example: 'S3curePass!',
    minLength: 8,
  })
  @IsString() @MinLength(8, { message: 'password must be at least 8 characters' })
  password: string;

  @ApiPropertyOptional({
    description: 'Registered legal/business name used on invoices',
    example: 'Acme Software Exports Pvt Ltd',
  })
  @IsOptional() @IsString()
  legalName?: string;
}
