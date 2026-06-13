import { Body, Controller, Get, NotFoundException, Patch } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ApiAuthErrors, ApiNotFound, ApiValidationErrors } from '../../common/swagger/api.decorators';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

const PROFILE_EXAMPLE = {
  id: '665f19f09a4e1c0012ab10aa',
  email: 'founder@acme.in',
  legalName: 'Acme Software Exports Pvt Ltd',
  gstin: '27AAPFU0939F1ZV',
  address: 'Unit 4, Tech Park, Pune 411057',
  defaultSac: '998314',
  bankAccount: '50100123456789',
  bankIfsc: 'HDFC0001234',
  lutNumber: 'AD2701260012345',
  lutFy: '2026-27',
  role: 'OWNER',
  orgId: '665f1a009a4e1c0012ab1100',
};

@ApiTags('Profile')
@ApiBearerAuth(BEARER_AUTH_NAME)
@ApiAuthErrors()
@Controller('profile')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get my profile', description: 'Returns the authenticated user\'s business profile (no password hash).' })
  @ApiOkResponse({ description: 'Current profile', schema: { example: { success: true, data: PROFILE_EXAMPLE } } })
  @ApiNotFound('User not found')
  async me(@CurrentUser() principal: AuthPrincipal) {
    const user = await this.users.findById(principal.userId);
    if (!user) throw new NotFoundException('User not found');
    return this.users.toProfile(user);
  }

  @Patch()
  @ApiOperation({ summary: 'Update my profile', description: 'Update business details used to render compliant invoices.' })
  @ApiOkResponse({ description: 'Updated profile', schema: { example: { success: true, data: PROFILE_EXAMPLE } } })
  @ApiValidationErrors()
  async update(@CurrentUser() principal: AuthPrincipal, @Body() dto: UpdateProfileDto) {
    const user = await this.users.updateProfile(principal.userId, dto);
    return this.users.toProfile(user);
  }
}
