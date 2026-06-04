import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional() @IsString() @MinLength(8)
  password?: string;

  @IsOptional() @IsString()
  googleId?: string;

  @IsOptional() @IsString()
  legalName?: string;
}
