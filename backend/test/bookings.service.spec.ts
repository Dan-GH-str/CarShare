import { ForbiddenException } from '@nestjs/common';
import { RateType, UserRole, UserStatus } from '@prisma/client';
import { BookingsService } from '../src/bookings/bookings.service';

describe('BookingsService', () => {
  it('prevents admins from creating bookings', async () => {
    const prisma = {
      $transaction: jest.fn((callback) =>
        callback({
          user: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              id: 'admin-id',
              role: UserRole.ADMIN,
              status: UserStatus.ACTIVE,
            }),
          },
        }),
      ),
    };
    const lifecycle = { expireStaleReservations: jest.fn().mockResolvedValue(undefined) };
    const service = new BookingsService(prisma as any, lifecycle as any);

    await expect(
      service.create('admin-id', {
        carId: 'car-id',
        rateType: RateType.HOURLY,
        units: 1,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
