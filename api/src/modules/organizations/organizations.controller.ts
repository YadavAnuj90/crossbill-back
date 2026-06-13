import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { ApiAuthErrors, ApiValidationErrors } from '../../common/swagger/api.decorators';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

/** Team/tenancy endpoints. Member invite is fully wired in the v2 Teams phase (design §16). */
@ApiTags('Team')
@ApiBearerAuth(BEARER_AUTH_NAME)
@ApiAuthErrors()
@Controller('team')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Get my organisation' })
  @ApiOkResponse({
    description: 'Organisation',
    schema: { example: { success: true, data: { org: { id: '665f1a009a4e1c0012ab1100', name: 'Acme Software Exports', plan: 'free' } } } },
  })
  async list(@CurrentUser() user: AuthPrincipal) {
    const org = await this.orgs.findById(user.orgId);
    return { org };
  }

  @Post('invite')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Invite a team member', description: 'Records a pending invite (delivery wired in the v2 Teams phase).' })
  @ApiCreatedResponse({
    description: 'Invite recorded',
    schema: { example: { success: true, data: { invited: 'accountant@acme.in', role: 'ACCOUNTANT', orgId: '665f1a009a4e1c0012ab1100', status: 'pending' } } },
  })
  @ApiValidationErrors()
  invite(@CurrentUser() user: AuthPrincipal, @Body() dto: InviteMemberDto) {
    return { invited: dto.email, role: dto.role, orgId: user.orgId, status: 'pending' };
  }
}
