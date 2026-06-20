import {
  Body, Controller, Delete, Get, Headers, Ip, Param, Post, Put, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { AgreementsService } from './agreements.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { SendAgreementDto } from './dto/send-agreement.dto';
import { SignAgreementDto } from './dto/sign-agreement.dto';
import { SetGeofencesDto } from './dto/geofence.dto';
import { SetLifecycleDto, AddObligationDto } from './dto/lifecycle.dto';
import { AadhaarInitDto, AadhaarVerifyDto } from './dto/aadhaar-gate.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Agreements')
@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreements: AgreementsService) {}

  // ── Authenticated (owner side) ──
  @Get()
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  list(@CurrentUser() user: AuthPrincipal, @Query() page: PaginationDto) {
    return this.agreements.list(user.orgId, page);
  }

  @Get('esign/status')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  esignStatus() {
    return this.agreements.esignStatus();
  }

  // ── Geofences (fraud-prevention config) ──
  @Get('geofences')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  getGeofences(@CurrentUser() user: AuthPrincipal) {
    return this.agreements.getGeofences(user.orgId);
  }

  @Put('geofences')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @ApiOperation({ summary: 'Set the allowed signing geofences' })
  @Roles(Role.OWNER, Role.ADMIN)
  setGeofences(@CurrentUser() user: AuthPrincipal, @Body() dto: SetGeofencesDto) {
    return this.agreements.setGeofences(user.orgId, dto.fences);
  }

  // ── Public eSign verifier ──
  @Get('verify/:code')
  @Public()
  @ApiOperation({ summary: 'Verify a signed agreement by its public code' })
  verify(@Param('code') code: string) {
    return this.agreements.verify(code);
  }

  // ── Searchable repository ──
  @Get('search')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  search(@CurrentUser() user: AuthPrincipal, @Query() page: PaginationDto, @Query('q') q?: string, @Query('status') status?: string) {
    return this.agreements.search(user.orgId, q, status, page);
  }

  // ── Lifecycle reminder sweep (cron-triggerable) ──
  @Post('lifecycle/run-reminders')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @ApiOperation({ summary: 'Send due renewal/expiry reminders' })
  @Roles(Role.OWNER, Role.ADMIN)
  runReminders() {
    return this.agreements.runLifecycleReminders();
  }

  @Get(':id')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  async get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return (await this.agreements.findOneScoped(user.orgId, id)).toJSON();
  }

  @Post()
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateAgreementDto) {
    return this.agreements.create(user.orgId, user.userId, dto);
  }

  @Post(':id/send')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @ApiOperation({ summary: 'Send an agreement to a client for native e-signature' })
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  send(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: SendAgreementDto) {
    return this.agreements.send(user.orgId, user.userId, id, dto);
  }

  // ── Lifecycle + obligations + clause review (per agreement) ──
  @Put(':id/lifecycle')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  setLifecycle(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: SetLifecycleDto) {
    return this.agreements.setLifecycle(user.orgId, id, dto);
  }

  @Get(':id/clause-review')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @ApiOperation({ summary: 'Heuristic review: flags missing standard clauses' })
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  clauseReview(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.agreements.clauseReview(user.orgId, id);
  }

  @Post(':id/obligations')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  addObligation(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: AddObligationDto) {
    return this.agreements.addObligation(user.orgId, id, dto);
  }

  @Put(':id/obligations/:obId')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  toggleObligation(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Param('obId') obId: string) {
    return this.agreements.toggleObligation(user.orgId, id, obId);
  }

  @Delete(':id/obligations/:obId')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  removeObligation(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Param('obId') obId: string) {
    return this.agreements.removeObligation(user.orgId, id, obId);
  }

  // ── Public signer flow (no auth; token-scoped) ──
  @Get('sign/:token')
  @Public()
  @ApiOperation({ summary: 'Fetch an agreement for signing (public, token-scoped)' })
  forSigning(@Param('token') token: string) {
    return this.agreements.getForSigning(token);
  }

  @Post('sign/:token/otp')
  @Public()
  @ApiOperation({ summary: 'Resend the signing OTP' })
  resendOtp(@Param('token') token: string) {
    return this.agreements.resendOtp(token);
  }

  @Post('sign/:token/aadhaar/init')
  @Public()
  @ApiOperation({ summary: 'Start Aadhaar OTP verification to unlock the document' })
  aadhaarInit(@Param('token') token: string, @Body() dto: AadhaarInitDto, @Ip() ip: string, @Headers('user-agent') ua: string) {
    return this.agreements.aadhaarInit(token, dto.aadhaar, ip, ua);
  }

  @Post('sign/:token/aadhaar/verify')
  @Public()
  @ApiOperation({ summary: 'Verify the Aadhaar OTP' })
  aadhaarVerify(@Param('token') token: string, @Body() dto: AadhaarVerifyDto) {
    return this.agreements.aadhaarVerify(token, dto.referenceId, dto.otp);
  }

  @Post('sign/:token')
  @Public()
  @ApiOperation({ summary: 'Submit a native electronic signature' })
  sign(
    @Param('token') token: string,
    @Body() dto: SignAgreementDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.agreements.sign(token, dto, ip, ua);
  }

  @Post('sign/:token/decline')
  @Public()
  @ApiOperation({ summary: 'Decline to sign' })
  decline(@Param('token') token: string, @Ip() ip: string) {
    return this.agreements.decline(token, ip);
  }
}
