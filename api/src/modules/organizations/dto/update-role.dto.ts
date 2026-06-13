import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { Role } from '../../../common/constants/roles.enum';

export class UpdateRoleDto {
  @ApiProperty({ description: 'Id of the member whose role is changing', example: '665f1b2c9a4e1c0012ab34cd' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'New role to assign', enum: Role, example: Role.ADMIN })
  @IsEnum(Role)
  role: Role;
}
