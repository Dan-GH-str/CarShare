import { Injectable } from '@nestjs/common';
import { BookingStatus, CarStatus } from '@prisma/client';
import { formatUserName } from '../common/user-name';
import { PrismaService } from '../prisma/prisma.service';
import { waitAmountFor } from './booking-rules';

@Injectable()
export class BookingLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async expireStaleReservations(now = new Date()) {
    const expired = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.RESERVED,
        expiresAt: { lte: now },
      },
      include: {
        user: true,
        car: { include: { model: true, tariffs: { where: { isActive: true } } } },
        receipt: true,
      },
    });

    if (!expired.length) {
      return 0;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const booking of expired) {
        const waitAmount = waitAmountFor(booking.startAt, booking.expiresAt);
        const updated = await tx.booking.updateMany({
          where: { id: booking.id, status: BookingStatus.RESERVED },
          data: {
            status: BookingStatus.EXPIRED,
            waitAmount,
            cancellationAmount: 0,
            totalAmount: waitAmount,
          },
        });

        const tariff = booking.car.tariffs[0];
        if (updated.count === 1 && waitAmount > 0 && !booking.receipt && tariff) {
          await tx.receipt.create({
            data: {
              bookingId: booking.id,
              number: `CS-${Date.now()}-${booking.id.slice(-4).toUpperCase()}`,
              carSnapshot: {
                id: booking.car.id,
                title: `${booking.car.model.brand} ${booking.car.model.name}`,
                trim: booking.car.model.trim,
                plateNumber: booking.car.plateNumber,
                color: booking.car.color,
              },
              userSnapshot: {
                id: booking.user.id,
                lastName: booking.user.lastName,
                firstName: booking.user.firstName,
                middleName: booking.user.middleName,
                displayName: formatUserName(booking.user),
                email: booking.user.email,
                phone: booking.user.phone,
              },
              tariffSnapshot: tariff,
              lines: [{ label: 'Платное ожидание без старта', amount: waitAmount }],
              totalAmount: waitAmount,
            },
          });
        }
      }

      await tx.car.updateMany({
        where: {
          id: { in: expired.map((booking) => booking.carId) },
          status: CarStatus.RESERVED,
        },
        data: { status: CarStatus.AVAILABLE },
      });
    });

    return expired.length;
  }
}
