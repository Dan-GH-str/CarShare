import { Injectable } from '@nestjs/common';
import { ModerationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  createServiceReview(userId: string, body: { rating: number; text: string }) {
    return this.prisma.serviceReview.create({
      data: {
        userId,
        rating: Math.min(5, Math.max(1, Number(body.rating))),
        text: body.text,
        moderationStatus: ModerationStatus.PUBLISHED,
      },
    });
  }
}
