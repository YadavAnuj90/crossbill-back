import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { LettersService } from './letters.service';
import { CreateLetterDto, LetterDecisionDto } from './dto/letter.dto';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('HR letters')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('letters')
export class LettersController {
  constructor(private readonly letters: LettersService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN, Role.ACCOUNTANT)
  list(@CurrentUser() user: AuthPrincipal, @Query('kind') kind?: string, @Query('employeeId') employeeId?: string) {
    return this.letters.list(user.orgId, kind, employeeId);
  }

  @Post()
  @ApiOperation({ summary: 'Generate an offer/experience/relieving letter' })
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN)
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateLetterDto) {
    return this.letters.create(user.orgId, dto);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN, Role.ACCOUNTANT)
  get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.letters.get(user.orgId, id);
  }

  @Patch(':id/status')
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN)
  setStatus(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: LetterDecisionDto) {
    return this.letters.setStatus(user.orgId, id, dto.status);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN)
  remove(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.letters.remove(user.orgId, id);
  }
}
