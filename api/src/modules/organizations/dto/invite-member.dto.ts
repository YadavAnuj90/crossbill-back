import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';
import { Role } from '../../../common/constants/roles.enum';

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email address of the person to invite',
    format: 'email',
    example: 'accountant@acme.in',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Role to grant the invited member',
    enum: Role,
    example: Role.ACCOUNTANT,
  })
  @IsEnum(Role)
  role: Role;
}
