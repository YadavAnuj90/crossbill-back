import {
  Body, Controller, Get, NotFoundException, Param, Post, Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  list(@CurrentUser() user: AuthPrincipal, @Query() page: PaginationDto, @Query('invoiceId') invoiceId?: string) {
    if (invoiceId) return this.notes.listForInvoice(user.orgId, invoiceId);
    return this.notes.list(user.orgId, page);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER)
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateNoteDto) {
    return this.notes.create(user.orgId, user.userId, dto);
  }

  @Get(':id/pdf')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.ACCOUNTANT)
  async pdf(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    const note = await this.notes.findOneScoped(user.orgId, id);
    if (!note.pdfUrl) throw new NotFoundException('PDF not ready yet');
    return { url: note.pdfUrl };
  }
}
