import { IsEnum, IsString } from 'class-validator';
import { Role } from '../../../common/constants/roles.enum';

export class UpdateRoleDto {
  @IsString()
  userId: string;

  @IsEnum(Role)
  role: Role;
}
