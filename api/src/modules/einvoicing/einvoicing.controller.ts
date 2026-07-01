import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { EInvoicingService } from './einvoicing.service';
import { CancelEInvoiceDto } from './dto/einvoice.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

const READ_ROLES = [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT];
const WRITE_ROLES = [Role.OWNER, Role.ADMIN, Role.MEMBER];

@ApiTags('E-Invoicing')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('einvoice')
export class EInvoicingController {
  constructor(private readonly svc: EInvoicingService) {}

  @Get('status')
  @ApiOperation({ summary: 'IRP provider/connection status' })
  @Roles(...READ_ROLES)
  status() {
    return this.svc.status();
  }

  @Get()
  @ApiOperation({ summary: 'List generated e-invoices' })
  @Roles(...READ_ROLES)
  list(@CurrentUser() user: AuthPrincipal, @Query() page: PaginationDto) {
    return this.svc.list(user.orgId, page);
  }

  @Get(':invoiceId')
  @ApiOperation({ summary: 'Get the e-invoice (IRN/QR) for an invoice, or null' })
  @Roles(...READ_ROLES)
  get(@CurrentUser() user: AuthPrincipal, @Param('invoiceId') invoiceId: string) {
    return this.svc.get(user.orgId, invoiceId);
  }

  @Post(':invoiceId/generate')
  @ApiOperation({ summary: 'Register the invoice on the IRP and mint an IRN + signed QR' })
  @Roles(...WRITE_ROLES)
  generate(@CurrentUser() user: AuthPrincipal, @Param('invoiceId') invoiceId: string) {
    return this.svc.generate(user.orgId, invoiceId, user.userId);
  }

  @Post(':invoiceId/cancel')
  @ApiOperation({ summary: 'Cancel the IRN (within 24h of generation)' })
  @Roles(...WRITE_ROLES)
  cancel(@CurrentUser() user: AuthPrincipal, @Param('invoiceId') invoiceId: string, @Body() dto: CancelEInvoiceDto) {
    return this.svc.cancel(user.orgId, invoiceId, dto.reason, user.userId);
  }
}
