import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, HR_MANAGE_ROLES } from '../../common/constants/roles.enum';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { LettersService } from './letters.service';
import { CreateLetterDto, LetterDecisionDto, ListLettersQueryDto } from './dto/letter.dto';
import { LetterStatus } from './schemas/hr-letter.schema';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('HR letters')
@ApiBearerAuth(BEARER_AUTH_NAME)
@Controller('letters')
export class LettersController {
  constructor(private readonly letters: LettersService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN, Role.ACCOUNTANT)
  list(@CurrentUser() user: AuthPrincipal, @Query() query: ListLettersQueryDto) {
    return this.letters.list(user.orgId, query.kind, query.employeeId, query.status);
  }

  @Post()
  @ApiOperation({ summary: 'Generate an offer/experience/relieving letter' })
  @Roles(...HR_MANAGE_ROLES)
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateLetterDto) {
    return this.letters.create(user.orgId, user.userId, dto);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.HR_ADMIN, Role.ACCOUNTANT)
  get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.letters.get(user.orgId, id);
  }

  @Patch(':id/status')
  @Roles(...HR_MANAGE_ROLES)
  setStatus(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: LetterDecisionDto) {
    return this.letters.setStatus(user.orgId, user.userId, id, dto.status as LetterStatus);
  }

  @Delete(':id')
  @Roles(...HR_MANAGE_ROLES)
  remove(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.letters.remove(user.orgId, user.userId, id);
  }
}
