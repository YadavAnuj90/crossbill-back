import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthPrincipal {
  userId: string;
  orgId: string;
  role: string;
  email: string;
}

/** Injects the authenticated principal resolved by JwtStrategy. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as AuthPrincipal;
  },
);
