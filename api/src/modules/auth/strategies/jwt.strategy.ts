import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthPrincipal } from '../../../common/decorators/current-user.decorator';

/** Validates the access token on every protected route and builds the principal (design §9). */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: { sub: string; org_id: string; role: string; email: string }): Promise<AuthPrincipal> {
    return { userId: payload.sub, orgId: payload.org_id, role: payload.role, email: payload.email };
  }
}
