import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/types/request-user.type';
import { CarsQuery, CarsService } from './cars.service';

@Controller('cars')
export class CarsController {
  constructor(private readonly cars: CarsService) {}

  @Get()
  findAll(@Query() query: CarsQuery) {
    return this.cars.findAll(query);
  }

  @Get('map')
  map(@Query() query: CarsQuery) {
    return this.cars.map(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.cars.findById(id);
  }

  @Get(':id/reviews')
  reviews(@Param('id') id: string) {
    return this.cars.reviews(id);
  }

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  createReview(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { rating: number; text: string },
  ) {
    return this.cars.createReview(user.id, id, body);
  }
}
