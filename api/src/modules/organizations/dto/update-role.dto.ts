import { IsEnum, IsUUID } from 'class-validator';
import { Role } from '../../../common/constants/roles.enum';

export class UpdateRoleDto {
  @IsUUID()
  userId: string;

  @IsEnum(Role)
  role: Role;
}
