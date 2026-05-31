import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/types/request-user.type';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, QuoteDto } from './dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post('quote')
  quote(@Body() dto: QuoteDto) {
    return this.bookings.quote(dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user.id, dto);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  active(@CurrentUser() user: RequestUser) {
    return this.bookings.active(user.id);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  start(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.bookings.start(user.id, id);
  }

  @Post(':id/finish')
  @UseGuards(JwtAuthGuard)
  finish(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.bookings.finish(user.id, id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.bookings.cancel(user.id, id);
  }
}
