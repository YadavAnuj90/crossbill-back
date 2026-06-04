import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { InviteMemberDto } from './dto/invite-member.dto';

/** Team/tenancy endpoints. Member invite is fully wired in the v2 Teams phase (design §16). */
@Controller('team')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  async list(@CurrentUser() user: AuthPrincipal) {
    const org = await this.orgs.findById(user.orgId);
    return { org };
  }

  @Post('invite')
  @Roles(Role.OWNER, Role.ADMIN)
  invite(@CurrentUser() user: AuthPrincipal, @Body() dto: InviteMemberDto) {
    // Phase 2 (Teams): create a pending membership + send Resend invite email.
    return { invited: dto.email, role: dto.role, orgId: user.orgId, status: 'pending' };
  }
}
