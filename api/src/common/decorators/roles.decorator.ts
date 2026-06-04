import { SetMetadata } from '@nestjs/common';
import { Role } from '../constants/roles.enum';

export const ROLES_KEY = 'roles';
/** Declares the roles allowed to invoke a handler (design §10). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
