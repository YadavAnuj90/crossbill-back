import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { PayrollService } from './payroll.service';
import { CreateSlipDto, RunPayrollDto } from './dto/payroll.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Payroll')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  // ── Salary slips ──
  @Get('slips')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  listSlips(@CurrentUser() user: AuthPrincipal, @Query('employeeId') employeeId?: string, @Query('month') month?: string) {
    return this.payroll.listSlips(user.orgId, employeeId, month);
  }

  @Post('slips')
  @ApiOperation({ summary: 'Create/update a salary slip (auto-computes net, renders PDF)' })
  @Roles(Role.OWNER, Role.ADMIN)
  createSlip(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateSlipDto) {
    return this.payroll.createSlip(user.orgId, dto);
  }

  @Get('slips/:id')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  getSlip(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.payroll.getSlip(user.orgId, id);
  }

  @Delete('slips/:id')
  @Roles(Role.OWNER, Role.ADMIN)
  removeSlip(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.payroll.removeSlip(user.orgId, id);
  }

  // ── Payroll runs ──
  @Get('runs')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  listRuns(@CurrentUser() user: AuthPrincipal) {
    return this.payroll.listRuns(user.orgId);
  }

  @Post('runs')
  @ApiOperation({ summary: 'Generate/refresh the payroll run summary for a period' })
  @Roles(Role.OWNER, Role.ADMIN)
  run(@CurrentUser() user: AuthPrincipal, @Body() dto: RunPayrollDto) {
    return this.payroll.runPayroll(user.orgId, dto.period);
  }

  @Post('runs/:period/finalise')
  @Roles(Role.OWNER, Role.ADMIN)
  finalise(@CurrentUser() user: AuthPrincipal, @Param('period') period: string) {
    return this.payroll.finaliseRun(user.orgId, period);
  }
}
