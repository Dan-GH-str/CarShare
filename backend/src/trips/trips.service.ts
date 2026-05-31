import { Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { BookingLifecycleService } from '../bookings/booking-lifecycle.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: BookingLifecycleService,
  ) {}

  async my(userId: string) {
    await this.lifecycle.expireStaleReservations();

    const [active, history] = await Promise.all([
      this.prisma.booking.findFirst({
        where: { userId, status: { in: [BookingStatus.RESERVED, BookingStatus.ACTIVE] } },
        include: { car: { include: { model: true, category: true } }, options: { include: { option: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.findMany({
        where: { userId, status: { in: [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.EXPIRED] } },
        include: {
          car: { include: { model: true, category: true } },
          options: { include: { option: true } },
          receipt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { active, history };
  }
}
