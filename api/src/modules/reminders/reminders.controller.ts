import { Controller, HttpCode, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/constants/roles.enum';
import { FemaReminderService } from './fema-reminder.service';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly fema: FemaReminderService) {}

  /** Run the FEMA aging sweep synchronously and return what it did (ops/testing). */
  @Post('fema/run')
  @Roles(Role.OWNER)
  @HttpCode(200)
  runFema() {
    return this.fema.sweep();
  }
}
