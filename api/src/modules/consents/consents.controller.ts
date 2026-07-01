import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { ConsentsService } from './consents.service';
import { CreateConsentDto } from './dto/create-consent.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Consents')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('consents')
export class ConsentsController {
  constructor(private readonly consents: ConsentsService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  list(@CurrentUser() user: AuthPrincipal, @Query() page: PaginationDto) {
    return this.consents.list(user.orgId, page);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateConsentDto) {
    return this.consents.create(user.orgId, dto, user.userId);
  }

  @Post(':id/withdraw')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  withdraw(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.consents.withdraw(user.orgId, id, user.userId);
  }
}
