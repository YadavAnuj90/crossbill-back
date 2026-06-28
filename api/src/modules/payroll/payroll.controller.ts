import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, HR_MANAGE_ROLES } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { PayrollService } from './payroll.service';
import {
  CreateSlipDto,
  UpdateSlipDto,
  RunPayrollDto,
  ListSlipsQueryDto,
  ListRunsQueryDto,
} from './dto/payroll.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Payroll')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  // ── Salary slips ──
  @Get('slips')
  @Roles(...HR_MANAGE_ROLES, Role.ACCOUNTANT)
  listSlips(@CurrentUser() user: AuthPrincipal, @Query() query: ListSlipsQueryDto) {
    return this.payroll.listSlips(user.orgId, {
      employeeId: query.employeeId,
      month: query.month,
      status: query.status,
    });
  }

  @Post('slips')
  @ApiOperation({ summary: 'Create a salary slip (auto-computes net, renders PDF)' })
  @Roles(...HR_MANAGE_ROLES)
  createSlip(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateSlipDto) {
    return this.payroll.createSlip(user.orgId, user.userId, dto);
  }

  @Get('slips/:id')
  @Roles(...HR_MANAGE_ROLES, Role.ACCOUNTANT)
  getSlip(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.payroll.getSlip(user.orgId, id);
  }

  @Patch('slips/:id')
  @ApiOperation({ summary: 'Update a draft salary slip (recomputes net, re-renders PDF)' })
  @Roles(...HR_MANAGE_ROLES)
  updateSlip(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateSlipDto,
  ) {
    return this.payroll.updateSlip(user.orgId, user.userId, id, dto);
  }

  @Delete('slips/:id')
  @Roles(...HR_MANAGE_ROLES)
  removeSlip(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.payroll.removeSlip(user.orgId, user.userId, id);
  }

  // ── Payroll runs ──
  @Get('runs')
  @Roles(...HR_MANAGE_ROLES, Role.ACCOUNTANT)
  listRuns(@CurrentUser() user: AuthPrincipal, @Query() query: ListRunsQueryDto) {
    return this.payroll.listRuns(user.orgId, { month: query.month, status: query.status });
  }

  @Post('runs')
  @ApiOperation({ summary: 'Generate/refresh the payroll run summary for a period' })
  @Roles(...HR_MANAGE_ROLES)
  run(@CurrentUser() user: AuthPrincipal, @Body() dto: RunPayrollDto) {
    return this.payroll.runPayroll(user.orgId, user.userId, dto.period);
  }

  @Post('runs/:period/finalise')
  @Roles(...HR_MANAGE_ROLES)
  finalise(@CurrentUser() user: AuthPrincipal, @Param('period') period: string) {
    return this.payroll.finaliseRun(user.orgId, user.userId, period);
  }
}
