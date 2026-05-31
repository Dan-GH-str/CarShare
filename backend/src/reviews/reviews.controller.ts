import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/types/request-user.type';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('service-reviews')
  @UseGuards(JwtAuthGuard)
  createServiceReview(@CurrentUser() user: RequestUser, @Body() body: { rating: number; text: string }) {
    return this.reviews.createServiceReview(user.id, body);
  }
}
