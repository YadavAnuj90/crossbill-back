import {
  Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  list(@CurrentUser() user: AuthPrincipal, @Query() page: PaginationDto) {
    return this.invoices.list(user.orgId, page);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateInvoiceDto) {
    return this.invoices.create(user.orgId, user.userId, dto);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  async findOne(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    const inv = await this.invoices.findOneScoped(user.orgId, id);
    return inv.toJSON();
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  update(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoices.update(user.orgId, id, dto);
  }

  @Get(':id/pdf')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
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
