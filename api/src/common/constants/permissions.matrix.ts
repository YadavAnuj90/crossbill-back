import { Role } from './roles.enum';

/** Central permission matrix (design §10): action -> allowed roles. */
export type Action =
  | 'client:read' | 'client:write'
  | 'invoice:read' | 'invoice:write'
  | 'remittance:read' | 'remittance:write'
  | 'report:run'
  | 'member:manage'
  | 'billing:manage'
  | 'org:delete';

export const PERMISSIONS: Record<Action, Role[]> = {
  'client:read':     [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT],
  'client:write':    [Role.OWNER, Role.ADMIN, Role.MEMBER],
  'invoice:read':    [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT],
  'invoice:write':   [Role.OWNER, Role.ADMIN, Role.MEMBER],
  'remittance:read': [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT],
  'remittance:write':[Role.OWNER, Role.ADMIN, Role.MEMBER],
  'report:run':      [Role.OWNER, Role.ADMIN, Role.ACCOUNTANT],
  'member:manage':   [Role.OWNER, Role.ADMIN],
  'billing:manage':  [Role.OWNER],
  'org:delete':      [Role.OWNER],
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[action]?.includes(role) ?? false;
}
