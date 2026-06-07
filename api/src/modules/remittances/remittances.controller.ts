import {
  Body, Controller, Get, Param, Post, Query, Res, StreamableFile, UploadedFile,
  ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { RemittancesService } from './remittances.service';
import { CreateRemittanceDto } from './dto/create-remittance.dto';

@Controller('remittances')
export class RemittancesController {
  constructor(private readonly remittances: RemittancesService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateRemittanceDto) {
    return this.remittances.create(user.orgId, dto);
  }

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  list(@CurrentUser() user: AuthPrincipal, @Query('invoiceId') invoiceId: string) {
    return this.remittances.listForInvoice(user.orgId, invoiceId);
  }

  /** Upload the FIRC / e-FIRA (PDF or image, ≤ 10 MB). */
  @Post(':id/firc')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  @UseInterceptors(FileInterceptor('firc', { limits: { fileSize: 10 * 1024 * 1024 } }))
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
