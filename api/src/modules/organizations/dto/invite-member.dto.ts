import { IsEmail, IsEnum } from 'class-validator';
import { Role } from '../../../common/constants/roles.enum';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(Role)
  role: Role;
}
