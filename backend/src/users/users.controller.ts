import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/types/request-user.type';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  profile(@CurrentUser() user: RequestUser) {
    return this.users.profile(user.id);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() body: { lastName?: string; firstName?: string; middleName?: string; phone?: string },
  ) {
    return this.users.updateProfile(user.id, body);
  }
}
