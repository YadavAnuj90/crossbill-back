import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { UpdateCompanyDto, SetVerificationDto } from './dto/company.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Company')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('company')
export class CompanyController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  get(@CurrentUser() user: AuthPrincipal) {
    return this.orgs.getCompany(user.orgId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update company details' })
  @Roles(Role.OWNER, Role.ADMIN)
  update(@CurrentUser() user: AuthPrincipal, @Body() dto: UpdateCompanyDto) {
    return this.orgs.updateCompany(user.orgId, dto, user.userId);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit company for verification (→ pending)' })
  @Roles(Role.OWNER, Role.ADMIN)
  submit(@CurrentUser() user: AuthPrincipal) {
    return this.orgs.submitVerification(user.orgId, user.userId);
  }

  @Patch('verification')
  @ApiOperation({ summary: 'Approve/reject verification (platform admin)' })
  // PLATFORM_ADMIN is the intended approver; OWNER is retained so existing single-tenant
  // setups keep working until a platform-admin account is provisioned. Remove OWNER to enforce.
  @Roles(Role.PLATFORM_ADMIN, Role.OWNER)
  setVerification(@CurrentUser() user: AuthPrincipal, @Body() dto: SetVerificationDto) {
    return this.orgs.setVerification(user.orgId, dto.status, dto.notes, user.userId);
  }
}
