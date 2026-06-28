import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, HR_MANAGE_ROLES } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Employees')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get('stats')
  @Roles(...HR_MANAGE_ROLES, Role.MANAGER, Role.MEMBER, Role.ACCOUNTANT)
  stats(@CurrentUser() user: AuthPrincipal) {
    return this.employees.stats(user.orgId);
  }

  @Get()
  @Roles(...HR_MANAGE_ROLES, Role.MANAGER, Role.MEMBER, Role.ACCOUNTANT)
  list(
    @CurrentUser() user: AuthPrincipal,
    @Query() page: PaginationDto,
    @Query('q') q?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
  ) {
    return this.employees.list(user.orgId, page, q, department, status);
  }

  @Get(':id')
  @Roles(...HR_MANAGE_ROLES, Role.MANAGER, Role.MEMBER, Role.ACCOUNTANT)
  get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.employees.get(user.orgId, id);
  }

  @Post()
  @Roles(...HR_MANAGE_ROLES)
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateEmployeeDto) {
    return this.employees.create(user.orgId, dto, user.userId);
  }

  @Patch(':id')
  @Roles(...HR_MANAGE_ROLES)
  update(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employees.update(user.orgId, id, dto, user.userId);
  }

  @Delete(':id')
  @Roles(...HR_MANAGE_ROLES)
  remove(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.employees.remove(user.orgId, id, user.userId);
  }
}
