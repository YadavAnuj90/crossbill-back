import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { GstrExportDto } from './dto/gstr-export.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('gstr-6a')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  gstr6a(@CurrentUser() user: AuthPrincipal, @Query() dto: GstrExportDto) {
    return this.reports.gstr6a(user.orgId, dto);
  }
}
