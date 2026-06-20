import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { AgreementTemplatesService } from './agreement-templates.service';
import { CreateTemplateDto, CreateFromTemplateDto, BulkSendDto } from './dto/template.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Agreement templates')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('agreement-templates')
export class AgreementTemplatesController {
  constructor(private readonly templates: AgreementTemplatesService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  list(@CurrentUser() user: AuthPrincipal, @Query() page: PaginationDto) {
    return this.templates.list(user.orgId, page);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateTemplateDto) {
    return this.templates.create(user.orgId, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  remove(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.templates.remove(user.orgId, id);
  }

  @Post(':id/use')
  @ApiOperation({ summary: 'Create a draft agreement from a template' })
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  use(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: CreateFromTemplateDto) {
    return this.templates.createFromTemplate(user.orgId, user.userId, id, dto);
  }

  @Post(':id/bulk-send')
  @ApiOperation({ summary: 'Create + send an agreement to many signers from a template' })
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  bulkSend(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: BulkSendDto) {
    return this.templates.bulkSend(user.orgId, user.userId, id, dto);
  }
}
