import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { GstrExportDto } from './dto/gstr-export.dto';
import { ApiAuthErrors, ApiValidationErrors } from '../../common/swagger/api.decorators';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Reports')
@ApiBearerAuth(BEARER_AUTH_NAME)
@ApiAuthErrors()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('gstr-6a')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'GSTR-1 Table 6A export', description: 'Returns the GSTR-1 Table 6A dataset for the given financial year.' })
  @ApiOkResponse({
    description: 'GSTR-6A rows',
    schema: { example: { success: true, data: { financialYear: '2026-27', rows: [{ invoiceNumber: 'INV-2026-0007', inrEquivalent: '417250.00' }] } } },
  })
  @ApiValidationErrors()
  gstr6a(@CurrentUser() user: AuthPrincipal, @Query() dto: GstrExportDto) {
    return this.reports.gstr6a(user.orgId, dto);
  }

  /** Download a ZIP of all invoices + FIRC + LUT reference for a financial year. */
  @Get('bundle')
  @Roles(Role.OWNER, Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Download compliance bundle (ZIP)', description: 'Streams a ZIP of all invoices, FIRC documents and LUT reference for the financial year.' })
  @ApiProduces('application/zip')
  @ApiOkResponse({ description: 'ZIP archive stream', schema: { type: 'string', format: 'binary' } })
  @ApiValidationErrors()
  async bundle(
    @CurrentUser() user: AuthPrincipal,
    @Query() dto: GstrExportDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.reports.buildBundle(user.orgId, user.userId, dto.financialYear);
    res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${filename}"` });
    return new StreamableFile(buffer);
  }
}
