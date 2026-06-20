import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { CheckoutDto } from '../payments/dto/checkout.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Billing')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  overview(@CurrentUser() user: AuthPrincipal) {
    return this.billing.overview(user.orgId);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Start a Razorpay checkout to upgrade the org plan' })
  @Roles(Role.OWNER, Role.ADMIN)
  checkout(@CurrentUser() user: AuthPrincipal, @Body() dto: CheckoutDto) {
    return this.billing.checkout(user.orgId, user.userId, dto.planId);
  }
}
