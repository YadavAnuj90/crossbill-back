import {
  ForbiddenException, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import { randomUUID, createHash } from 'crypto';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { Role } from '../../common/constants/roles.enum';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { RegisterDto } from './dto/register.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: string;
  org_id: string;
  role: Role;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly orgs: OrganizationsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectModel(RefreshToken.name) private readonly refreshTokens: Model<RefreshTokenDocument>,
  ) {}

  // ───────────────────────── Registration / login ─────────────────────────

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ForbiddenException('Email already registered');

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const org = await this.orgs.createForOwner(dto.legalName ?? `${dto.email}'s workspace`);
    const user = await this.users.create({
      email: dto.email,
      legalName: dto.legalName,
      passwordHash,
      orgId: org.id,
    });
    await this.orgs.setOwner(org.id, user.id);
    return this.issueTokens({ sub: user.id, org_id: org.id, role: user.role, email: user.email });
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash) return null;
    const ok = await argon2.verify(user.passwordHash, password);
    return ok ? user : null;
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.validateCredentials(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens({
      sub: user.id, org_id: user.orgId!, role: user.role, email: user.email,
    });
  }

  // ───────────────────────── Google OAuth ─────────────────────────

  async loginWithGoogle(profile: { email: string; googleId: string; name?: string }): Promise<TokenPair> {
    let user = await this.users.findByEmail(profile.email);
    if (!user) {
      const org = await this.orgs.createForOwner(profile.name ?? `${profile.email}'s workspace`);
      user = await this.users.create({
        email: profile.email, googleId: profile.googleId, legalName: profile.name, orgId: org.id,
      });
      await this.orgs.setOwner(org.id, user.id);
      await this.users.markEmailVerified(user.id);
    } else if (!user.googleId) {
      await this.users.linkGoogle(user.id, profile.googleId);
    }
    return this.issueTokens({
      sub: user.id, org_id: user.orgId!, role: user.role, email: user.email,
    });
  }

  // ───────────────────────── Refresh rotation ─────────────────────────

  async refresh(presentedToken: string): Promise<TokenPair> {
    let payload: JwtPayload & { fid?: string };
    try {
      payload = await this.jwt.verifyAsync(presentedToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const familyId = payload.fid!;
    const hash = this.hashToken(presentedToken);
    const stored = await this.refreshTokens
      .findOne({ userId: payload.sub, familyId })
      .sort({ createdAt: -1 })
      .exec();

    // Reuse detection: presented token doesn't match the latest issued one for this family.
    if (!stored || stored.revoked || stored.tokenHash !== hash) {
      await this.revokeFamily(familyId); // theft signal — burn the whole family (design §9)
      throw new UnauthorizedException('Refresh token reuse detected; session revoked');
    }

    stored.revoked = true;
    await stored.save();

    // Re-read the live identity from the DB so role/org changes propagate and stale-role
    // tokens self-heal (a token minted before the role claim existed would otherwise persist).
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User no longer exists');

    return this.issueTokens(
      {
        sub: user.id,
        org_id: user.orgId ?? payload.org_id,
        role: user.role ?? Role.OWNER,
        email: user.email,
      },
      familyId,
    );
  }

  async logout(userId: string, familyId?: string) {
    if (familyId) await this.revokeFamily(familyId);
    else await this.refreshTokens.updateMany({ userId, revoked: false }, { revoked: true }).exec();
  }

  // ───────────────────────── helpers ─────────────────────────

  private async issueTokens(payload: JwtPayload, familyId: string = randomUUID()): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<number>('jwt.accessTtl'),
    });

    const refreshTtl = this.config.get<number>('jwt.refreshTtl')!;
    const refreshToken = await this.jwt.signAsync(
      { ...payload, fid: familyId },
      { secret: this.config.get<string>('jwt.refreshSecret'), expiresIn: refreshTtl },
    );

    await this.refreshTokens.create({
      userId: payload.sub,
      familyId,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtl * 1000),
    });

    return { accessToken, refreshToken };
  }

  private async revokeFamily(familyId: string) {
    await this.refreshTokens.updateMany({ familyId }, { revoked: true }).exec();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
