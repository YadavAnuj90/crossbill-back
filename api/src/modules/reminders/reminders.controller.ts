import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { FemaReminderService } from './fema-reminder.service';
import { ApiAuthErrors } from '../../common/swagger/api.decorators';
import { BEARER_AUTH_NAME } from '../../common/swagger/swagger.setup';

@ApiTags('Reminders')
@ApiBearerAuth(BEARER_AUTH_NAME)
@ApiAuthErrors()
@Controller('reminders')
export class RemindersController {
  constructor(private readonly fema: FemaReminderService) {}

  /** Run the FEMA aging sweep synchronously and return what it did (ops/testing). */
  @Post('fema/run')
  @Roles(Role.OWNER)
  @HttpCode(200)
  @ApiOperation({ summary: 'Run FEMA aging sweep', description: 'Runs the FEMA aging sweep synchronously (OWNER only) and reports what reminders it queued.' })
  @ApiOkResponse({ description: 'Sweep result', schema: { example: { success: true, data: { scanned: 12, remindersQueued: 3 } } } })
  runFema() {
    return this.fema.sweep();
  }
}
