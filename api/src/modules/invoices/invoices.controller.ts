import {
  Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Res,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiAuthErrors, ApiNotFound, ApiValidationErrors } from '../../common/swagger/api.decorators';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

const INVOICE_EXAMPLE = {
  id: '665f1b2c9a4e1c0012ab34cd',
  orgId: '665f1a009a4e1c0012ab1100',
  type: 'export',
  clientId: '665f1b2c9a4e1c0012ab34cd',
  number: 'INV-2026-0007',
  financialYear: '2026-27',
  invoiceDate: '2026-06-12',
  currency: 'USD',
  fxRate: '83.4500',
  subtotal: '5000.00',
  inrEquivalent: '417250.00',
  taxType: 'LUT_ZERO',
  grandTotal: '5000.00',
  status: 'draft',
  femaDueDate: '2026-12-09',
  pdfUrl: null,
  items: [
    { description: 'Software development services', sacCode: '998314', quantity: '1', unitAmount: '5000.00', lineTotal: '5000.00', gstRate: 0 },
  ],
};

@ApiTags('Invoices')
@ApiBearerAuth(BEARER_AUTH_NAME)
@ApiAuthErrors()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'List invoices', description: 'Paginated list of invoices in the organisation.' })
  @ApiOkResponse({
    description: 'Paginated invoices',
    schema: { example: { success: true, data: [INVOICE_EXAMPLE], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } } },
  })
  list(@CurrentUser() user: AuthPrincipal, @Query() page: PaginationDto) {
    return this.invoices.list(user.orgId, page);
  }

  // NOTE: declared before ':id' so it isn't captured as an invoice id.
  @Get('fema/aging')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  @ApiOperation({
    summary: 'FEMA aging buckets',
    description: 'Export invoices grouped by days-to-realisation bucket against the FEMA deadline.',
  })
  @ApiOkResponse({
    description: 'Aging buckets',
    schema: { example: { success: true, data: { buckets: { '0-30': 2, '31-60': 1, overdue: 0 } } } },
  })
  femaAging(@CurrentUser() user: AuthPrincipal) {
    return this.invoices.femaAging(user.orgId);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  @ApiOperation({
    summary: 'Create an invoice',
    description: 'Creates an export or domestic invoice. Number, FX rate, tax breakup and FEMA due date are computed server-side.',
  })
  @ApiCreatedResponse({ description: 'Invoice created', schema: { example: { success: true, data: INVOICE_EXAMPLE } } })
  @ApiValidationErrors()
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateInvoiceDto) {
    return this.invoices.create(user.orgId, user.userId, dto);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Get an invoice by id' })
  @ApiParam({ name: 'id', description: 'Invoice id', example: '665f1b2c9a4e1c0012ab34cd' })
  @ApiOkResponse({ description: 'Invoice', schema: { example: { success: true, data: INVOICE_EXAMPLE } } })
  @ApiNotFound('Invoice not found')
  async findOne(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    const inv = await this.invoices.findOneScoped(user.orgId, id);
    return inv.toJSON();
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  @ApiOperation({ summary: 'Update invoice status', description: 'Only the status may change; financial fields are immutable.' })
  @ApiParam({ name: 'id', description: 'Invoice id', example: '665f1b2c9a4e1c0012ab34cd' })
  @ApiOkResponse({ description: 'Invoice updated', schema: { example: { success: true, data: { ...INVOICE_EXAMPLE, status: 'sent' } } } })
  @ApiValidationErrors()
  @ApiNotFound('Invoice not found')
  update(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoices.update(user.orgId, id, dto);
  }

  @Get(':id/pdf')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Get invoice PDF url', description: 'Returns the generated PDF url, or 404 while generation is still queued.' })
  @ApiParam({ name: 'id', description: 'Invoice id', example: '665f1b2c9a4e1c0012ab34cd' })
  @ApiOkResponse({
    description: 'PDF location',
    schema: { example: { success: true, data: { url: 'https://files.crossbill.app/invoices/INV-2026-0007.pdf', status: 'sent' } } },
  })
  @ApiNotFound('PDF not ready yet; generation is queued')
  async pdf(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Res({ passthrough: true }) _res: Response,
  ) {
    const invoice = await this.invoices.findOneScoped(user.orgId, id);
    if (!invoice.pdfUrl) {
      throw new NotFoundException('PDF not ready yet; generation is queued');
    }
    return { url: invoice.pdfUrl, status: invoice.status };
  }
}
