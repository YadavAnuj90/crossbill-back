import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, HR_MANAGE_ROLES } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';
import {
  CheckDto,
  CreateLeaveDto,
  LeaveDecisionDto,
  ListAttendanceQueryDto,
  ListLeaveQueryDto,
} from './dto/attendance.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Attendance & leave')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller()
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  // ── Attendance ──
  @Post('attendance/check-in')
  @Roles(...HR_MANAGE_ROLES)
  checkIn(@CurrentUser() user: AuthPrincipal, @Body() dto: CheckDto, @Ip() ip: string) {
    return this.svc.checkIn(user.orgId, dto.employeeId, ip);
  }

  @Post('attendance/check-out')
  @Roles(...HR_MANAGE_ROLES)
  checkOut(@CurrentUser() user: AuthPrincipal, @Body() dto: CheckDto) {
    return this.svc.checkOut(user.orgId, dto.employeeId);
  }

  @Get('attendance/today')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT, Role.HR_ADMIN, Role.MANAGER)
  today(@CurrentUser() user: AuthPrincipal) {
    return this.svc.today(user.orgId);
  }

  @Get('attendance/summary')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT, Role.HR_ADMIN, Role.MANAGER)
  summary(@CurrentUser() user: AuthPrincipal, @Query('month') month: string) {
    return this.svc.summary(user.orgId, month || new Date().toISOString().slice(0, 7));
  }

  @Get('attendance/stats')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT, Role.HR_ADMIN, Role.MANAGER)
  stats(@CurrentUser() user: AuthPrincipal) {
    return this.svc.stats(user.orgId);
  }

  @Get('attendance')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT, Role.HR_ADMIN, Role.MANAGER)
  list(@CurrentUser() user: AuthPrincipal, @Query() q: ListAttendanceQueryDto) {
    return this.svc.list(user.orgId, q);
  }

  // ── Leave ──
  @Post('leaves')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.HR_ADMIN, Role.MANAGER, Role.EMPLOYEE)
  requestLeave(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateLeaveDto) {
    return this.svc.requestLeave(user.orgId, dto);
  }

  @Get('leaves')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT, Role.HR_ADMIN, Role.MANAGER)
  listLeaves(@CurrentUser() user: AuthPrincipal, @Query() q: ListLeaveQueryDto) {
    return this.svc.listLeaves(user.orgId, q);
  }

  @Patch('leaves/:id/decision')
  @Roles(...HR_MANAGE_ROLES, Role.MANAGER)
  decide(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: LeaveDecisionDto) {
    return this.svc.decideLeave(user.orgId, id, dto.decision, user.userId);
  }
}
