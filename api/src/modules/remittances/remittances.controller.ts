import {
  Body, Controller, Get, Param, Post, Query, Res, StreamableFile, UploadedFile,
  ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation,
  ApiParam, ApiProduces, ApiQuery, ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { RemittancesService } from './remittances.service';
import { CreateRemittanceDto } from './dto/create-remittance.dto';
import { ApiAuthErrors, ApiNotFound, ApiValidationErrors } from '../../common/swagger/api.decorators';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

const REMITTANCE_EXAMPLE = {
  id: '665f2a119a4e1c0012ab55ef',
  orgId: '665f1a009a4e1c0012ab1100',
  invoiceId: '665f1b2c9a4e1c0012ab34cd',
  amountReceived: '5000.00',
  currency: 'USD',
  receivedDate: '2026-06-10',
  purposeCode: 'P0802',
  fircUrl: null,
  createdAt: '2026-06-10T09:30:00.000Z',
};

@ApiTags('Remittances')
@ApiBearerAuth(BEARER_AUTH_NAME)
@ApiAuthErrors()
@Controller('remittances')
export class RemittancesController {
  constructor(private readonly remittances: RemittancesService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  @ApiOperation({ summary: 'Record an inward remittance' })
  @ApiCreatedResponse({ description: 'Remittance recorded', schema: { example: { success: true, data: REMITTANCE_EXAMPLE } } })
  @ApiValidationErrors()
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateRemittanceDto) {
    return this.remittances.create(user.orgId, dto);
  }

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'List remittances for an invoice' })
  @ApiQuery({ name: 'invoiceId', required: true, description: 'Invoice id to list remittances for', example: '665f1b2c9a4e1c0012ab34cd' })
  @ApiOkResponse({ description: 'Remittances', schema: { example: { success: true, data: [REMITTANCE_EXAMPLE] } } })
  list(@CurrentUser() user: AuthPrincipal, @Query('invoiceId') invoiceId: string) {
    return this.remittances.listForInvoice(user.orgId, invoiceId);
  }

  /** Upload the FIRC / e-FIRA (PDF or image, ≤ 10 MB). */
  @Post(':id/firc')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  @UseInterceptors(FileInterceptor('firc', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload FIRC / e-FIRA', description: 'Attach the bank FIRC document (PDF or image, max 10 MB) to a remittance.' })
  @ApiParam({ name: 'id', description: 'Remittance id', example: '665f2a119a4e1c0012ab55ef' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['firc'],
      properties: { firc: { type: 'string', format: 'binary', description: 'FIRC file (pdf/png/jpg, ≤ 10 MB)' } },
    },
  })
  @ApiCreatedResponse({ description: 'FIRC attached', schema: { example: { success: true, data: { ...REMITTANCE_EXAMPLE, fircUrl: '/api/v1/remittances/665f2a119a4e1c0012ab55ef/firc' } } } })
  @ApiValidationErrors()
  @ApiNotFound('Remittance not found')
  uploadFirc(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(pdf|png|jpe?g)$/ }),
        ],
      }),
    )
    file: { originalname: string; buffer: Buffer; mimetype: string },
  ) {
    return this.remittances.attachFirc(user.orgId, id, file);
  }

  /** Scoped FIRC download — streamed, bypasses the JSON envelope. */
  @Get(':id/firc')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Download FIRC', description: 'Streams the stored FIRC document inline (bypasses the JSON envelope).' })
  @ApiParam({ name: 'id', description: 'Remittance id', example: '665f2a119a4e1c0012ab55ef' })
  @ApiProduces('application/pdf', 'image/png', 'image/jpeg')
  @ApiOkResponse({ description: 'Binary FIRC document stream', schema: { type: 'string', format: 'binary' } })
  @ApiNotFound('FIRC not found for this remittance')
  async downloadFirc(
    @CurrentUser() user: AuthPrincipal,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename, contentType } = await this.remittances.readFirc(user.orgId, id);
    res.set({ 'Content-Type': contentType, 'Content-Disposition': `inline; filename="${filename}"` });
    return new StreamableFile(buffer);
  }
}
