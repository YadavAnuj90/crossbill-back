import { Body, Controller, Get, Ip, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';
import { CheckDto, CreateLeaveDto, LeaveDecisionDto } from './dto/attendance.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Attendance & leave')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller()
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  // ── Attendance ──
  @Post('attendance/check-in')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  checkIn(@CurrentUser() user: AuthPrincipal, @Body() dto: CheckDto, @Ip() ip: string) {
    return this.svc.checkIn(user.orgId, dto.employeeId, ip);
  }

  @Post('attendance/check-out')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  checkOut(@CurrentUser() user: AuthPrincipal, @Body() dto: CheckDto) {
    return this.svc.checkOut(user.orgId, dto.employeeId);
  }

  @Get('attendance/today')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  today(@CurrentUser() user: AuthPrincipal) {
    return this.svc.today(user.orgId);
  }

  @Get('attendance/summary')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  summary(@CurrentUser() user: AuthPrincipal, @Query('month') month: string) {
    return this.svc.summary(user.orgId, month || new Date().toISOString().slice(0, 7));
  }

  @Get('attendance/stats')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  stats(@CurrentUser() user: AuthPrincipal) {
    return this.svc.stats(user.orgId);
  }

  @Get('attendance')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  list(@CurrentUser() user: AuthPrincipal, @Query('employeeId') employeeId?: string, @Query('month') month?: string) {
    return this.svc.list(user.orgId, employeeId, month);
  }

  // ── Leave ──
  @Post('leaves')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  requestLeave(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateLeaveDto) {
    return this.svc.requestLeave(user.orgId, dto);
  }

  @Get('leaves')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  listLeaves(@CurrentUser() user: AuthPrincipal, @Query('status') status?: string, @Query('employeeId') employeeId?: string) {
    return this.svc.listLeaves(user.orgId, status, employeeId);
  }

  @Patch('leaves/:id/decision')
  @Roles(Role.OWNER, Role.ADMIN)
  decide(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: LeaveDecisionDto) {
    return this.svc.decideLeave(user.orgId, id, dto.decision, user.userId);
  }
}
