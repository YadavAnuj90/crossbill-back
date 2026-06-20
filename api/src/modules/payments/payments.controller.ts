import {
  Body, Controller, Get, Headers, HttpCode, Post, Query, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentLinkDto } from './dto/create-payment-link.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('status')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  status() {
    return { configured: this.payments.configured(), provider: 'razorpay' };
  }

  @Get()
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  list(@CurrentUser() user: AuthPrincipal, @Query() page: PaginationDto, @Query('invoiceId') invoiceId?: string) {
    if (invoiceId) return this.payments.listForInvoice(user.orgId, invoiceId);
    return this.payments.list(user.orgId, page);
  }

  @Post('links')
  @ApiBearerAuth(BEARER_AUTH_NAME)
  @ApiOperation({ summary: 'Create a Razorpay payment link for an invoice' })
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  createLink(@CurrentUser() user: AuthPrincipal, @Body() dto: CreatePaymentLinkDto) {
    return this.payments.createInvoiceLink(user.orgId, dto.invoiceId);
  }

  /** Razorpay → Crossbill webhook. No auth; verified by HMAC signature over the raw body. */
  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Razorpay webhook (payment_link.paid → auto-reconcile)' })
  webhook(@Req() req: RawBodyRequest<Request>, @Headers('x-razorpay-signature') signature?: string) {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    return this.payments.handleWebhook(raw, signature);
  }
}
