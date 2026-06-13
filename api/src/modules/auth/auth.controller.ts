import {
  Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService, TokenPair } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { ApiAuthErrors, ApiValidationErrors } from '../../common/swagger/api.decorators';
import { BEARER_AUTH_NAME, REFRESH_COOKIE_NAME } from '../../common/swagger/swagger.setup';

const REFRESH_COOKIE = 'crossbill_rt';

const ACCESS_TOKEN_EXAMPLE = {
  success: true,
  data: { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new account',
    description:
      'Creates a user + organisation and returns an access token. The refresh token is set as the `crossbill_rt` httpOnly cookie.',
  })
  @ApiOkResponse({ description: 'Account created', schema: { example: ACCESS_TOKEN_EXAMPLE } })
  @ApiValidationErrors()
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.register(dto);
    return this.respondWithTokens(tokens, res);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Log in with email & password',
    description: 'Returns an access token and sets the `crossbill_rt` httpOnly refresh cookie.',
  })
  @ApiOkResponse({ description: 'Authenticated', schema: { example: ACCESS_TOKEN_EXAMPLE } })
  @ApiValidationErrors()
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.login(dto.email, dto.password);
    return this.respondWithTokens(tokens, res);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Start Google OAuth',
    description: 'Redirects the browser to the Google consent screen. Open this in a browser, not via fetch.',
  })
  google() {
    /* Passport redirects to Google consent. */
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth callback',
    description: 'Google redirects here. Sets the refresh cookie and redirects to the app with the access token in the URL fragment.',
  })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.auth.loginWithGoogle(req.user as any);
    this.setRefreshCookie(tokens.refreshToken, res);
    const appUrl = this.config.get<string>('appUrl');
    res.redirect(`${appUrl}/auth/callback#access_token=${tokens.accessToken}`);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({
    summary: 'Rotate tokens',
    description: 'Reads the `crossbill_rt` cookie, rotates the refresh token and returns a fresh access token.',
  })
  @ApiOkResponse({ description: 'New access token issued', schema: { example: ACCESS_TOKEN_EXAMPLE } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const presented = req.cookies?.[REFRESH_COOKIE];
    const tokens = await this.auth.refresh(presented);
    return this.respondWithTokens(tokens, res);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @ApiOperation({ summary: 'Log out', description: 'Revokes refresh tokens for the user and clears the refresh cookie.' })
  @ApiOkResponse({ description: 'Logged out', schema: { example: { success: true, data: { loggedOut: true } } } })
  @ApiAuthErrors()
  async logout(@CurrentUser() user: AuthPrincipal, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(user.userId);
    res.clearCookie(REFRESH_COOKIE);
    return { loggedOut: true };
  }

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
