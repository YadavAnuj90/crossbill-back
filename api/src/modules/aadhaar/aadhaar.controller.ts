import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { AadhaarService } from './aadhaar.service';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Aadhaar verification')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('aadhaar')
export class AadhaarController {
  constructor(private readonly aadhaar: AadhaarService) {}

  @Get('status')
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  status() {
    return this.aadhaar.status();
  }

  @Get('verifications')
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN, Role.ACCOUNTANT)
  list(@CurrentUser() user: AuthPrincipal, @Query('agreementId') agreementId?: string) {
    return this.aadhaar.list(user.orgId, agreementId);
  }
}
