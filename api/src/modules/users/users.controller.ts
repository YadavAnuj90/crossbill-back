import { Body, Controller, Get, NotFoundException, Patch } from '@nestjs/common';
import { CurrentUser, AuthPrincipal } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profile')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async me(@CurrentUser() principal: AuthPrincipal) {
    const user = await this.users.findById(principal.userId);
    if (!user) throw new NotFoundException('User not found');
    return this.users.toProfile(user);
  }

  @Patch()
  async update(@CurrentUser() principal: AuthPrincipal, @Body() dto: UpdateProfileDto) {
    const user = await this.users.updateProfile(principal.userId, dto);
    return this.users.toProfile(user);
  }
}
