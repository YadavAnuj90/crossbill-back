import {
  Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService, TokenPair } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';

const REFRESH_COOKIE = 'crossbill_rt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ── email/password ──
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.register(dto);
    return this.respondWithTokens(tokens, res);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(dto.email, dto.password);
    return this.respondWithTokens(tokens, res);
  }

  // ── Google OAuth ──
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  google() {
    /* Passport redirects to Google consent. */
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.auth.loginWithGoogle(req.user as any);
    this.setRefreshCookie(tokens.refreshToken, res);
    // Hand the access token back to the SPA.
    const appUrl = this.config.get<string>('appUrl');
    res.redirect(`${appUrl}/auth/callback#access_token=${tokens.accessToken}`);
  }

  // ── refresh / logout ──
  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const presented = req.cookies?.[REFRESH_COOKIE];
    const tokens = await this.auth.refresh(presented);
    return this.respondWithTokens(tokens, res);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthPrincipal, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(user.userId);
    res.clearCookie(REFRESH_COOKIE);
    return { loggedOut: true };
  }

  // ── helpers ──
  private respondWithTokens(tokens: TokenPair, res: Response) {
    this.setRefreshCookie(tokens.refreshToken, res);
    return { accessToken: tokens.accessToken };
  }

  private setRefreshCookie(token: string, res: Response) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('env') === 'production',
      sameSite: 'lax',
      maxAge: this.config.get<number>('jwt.refreshTtl')! * 1000,
      path: '/api/v1/auth',
    });
  }
}
