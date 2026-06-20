import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { LifecycleService } from './lifecycle.service';
import { CreateExitDto, UpdateExitDto, ToggleChecklistDto } from './dto/lifecycle.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Onboarding & exit')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller()
export class LifecycleController {
  constructor(private readonly svc: LifecycleService) {}

  // ── Onboarding ──
  @Get('onboarding/:employeeId')
  @ApiOperation({ summary: 'Get (or start) an employee onboarding checklist' })
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN, Role.ACCOUNTANT)
  getOnboarding(@CurrentUser() user: AuthPrincipal, @Param('employeeId') employeeId: string) {
    return this.svc.getOnboarding(user.orgId, employeeId);
  }

  @Patch('onboarding/:employeeId/items/:itemId')
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN)
  toggleItem(@CurrentUser() user: AuthPrincipal, @Param('employeeId') employeeId: string, @Param('itemId') itemId: string, @Body() dto: ToggleChecklistDto) {
    return this.svc.toggleChecklist(user.orgId, employeeId, itemId, dto);
  }

  // ── Exit ──
  @Get('exits')
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN, Role.ACCOUNTANT)
  list(@CurrentUser() user: AuthPrincipal, @Query('status') status?: string) {
    return this.svc.list(user.orgId, status);
  }

  @Post('exits')
  @ApiOperation({ summary: 'Initiate an employee exit' })
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN)
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateExitDto) {
    return this.svc.createExit(user.orgId, dto);
  }

  @Get('exits/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN, Role.ACCOUNTANT)
  get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.svc.getExit(user.orgId, id);
  }

  @Patch('exits/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN, Role.MANAGER)
  update(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: UpdateExitDto) {
    return this.svc.updateExit(user.orgId, id, dto);
  }
}
