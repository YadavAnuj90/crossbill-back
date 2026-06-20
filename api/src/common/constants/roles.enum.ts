/** Organisation-scoped roles (design §10).
 *  HR_ADMIN / MANAGER / EMPLOYEE added for the HR platform — additive and
 *  forward-compatible; existing OWNER/ADMIN/MEMBER/ACCOUNTANT flows are unchanged.
 */
export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  ACCOUNTANT = 'ACCOUNTANT',
  HR_ADMIN = 'HR_ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

/** Roles that can manage HR records (employees, attendance, payroll). */
export const HR_MANAGE_ROLES = [Role.OWNER, Role.ADMIN, Role.HR_ADMIN] as const;
