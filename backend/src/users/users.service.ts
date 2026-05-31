import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { formatUserName } from '../common/user-name';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(userId: string) {
    const [user, tripsCount, spend, lastBooking] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          lastName: true,
          firstName: true,
          middleName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.booking.count({ where: { userId, status: BookingStatus.COMPLETED } }),
      this.prisma.booking.aggregate({
        where: { userId, status: BookingStatus.COMPLETED },
        _sum: { totalAmount: true },
      }),
      this.prisma.booking.findFirst({
        where: { userId, status: BookingStatus.COMPLETED },
        include: { car: { include: { model: true } } },
        orderBy: { actualEndAt: 'desc' },
      }),
    ]);

    return {
      ...user,
      displayName: formatUserName(user),
      stats: {
        tripsCount,
        totalSpend: spend._sum.totalAmount ?? 0,
        lastCar: lastBooking
          ? `${lastBooking.car.model.brand} ${lastBooking.car.model.name}`
          : null,
      },
    };
  }

  async updateProfile(userId: string, data: Prisma.UserUpdateInput) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastName: typeof data.lastName === 'string' ? data.lastName : undefined,
        firstName: typeof data.firstName === 'string' ? data.firstName : undefined,
        middleName: typeof data.middleName === 'string' ? data.middleName || null : undefined,
        phone: typeof data.phone === 'string' ? data.phone : undefined,
      },
      select: {
        id: true,
        email: true,
        lastName: true,
        firstName: true,
        middleName: true,
        phone: true,
        role: true,
        status: true,
      },
    });
    return { ...user, displayName: formatUserName(user) };
  }
}
