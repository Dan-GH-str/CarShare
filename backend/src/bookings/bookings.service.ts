import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, CarStatus, Prisma, RateType, UserRole } from '@prisma/client';
import { formatUserName } from '../common/user-name';
import { PrismaService } from '../prisma/prisma.service';
import { calculateQuote, QuoteOption, QuoteTariff, unitBoundsFor, unitsFromDuration } from '../pricing/pricing.service';
import { BookingLifecycleService } from './booking-lifecycle.service';
import {
  bookingTiming,
  cancellationChargeFor,
  canStartBooking,
  FREE_WAIT_MINUTES,
  LATE_CANCELLATION_FEE,
  START_LEAD_MINUTES,
  WAIT_PRICE_PER_MINUTE,
  waitAmountFor,
} from './booking-rules';
import { CreateBookingDto, QuoteDto } from './dto';

type Tx = Prisma.TransactionClient;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: BookingLifecycleService,
  ) {}

  async quote(dto: QuoteDto) {
    await this.lifecycle.expireStaleReservations();
    const { car, tariff, options } = await this.resolveQuoteInput(this.prisma, dto);
    const startAt = this.resolveStartAt(dto.startAt);
    this.validatePlannedUnits(dto.rateType, dto.units, tariff);
    const quote = calculateQuote({
      rateType: dto.rateType,
      units: dto.units,
      tariff,
      options,
    });
    const timing = bookingTiming(startAt);

    return {
      carId: car.id,
      carTitle: `${car.model.brand} ${car.model.name}`,
      startAt,
      plannedEndAt: this.plannedEndAt(startAt, dto.rateType, quote.units),
      freeWaitUntil: timing.freeWaitUntil,
      expiresAt: timing.expiresAt,
      waitAmount: 0,
      cancellationAmount: 0,
      waitPricePerMinute: WAIT_PRICE_PER_MINUTE,
      freeWaitMinutes: FREE_WAIT_MINUTES,
      lateCancellationFee: LATE_CANCELLATION_FEE,
      startLeadMinutes: START_LEAD_MINUTES,
      ...quote,
    };
  }

  async create(userId: string, dto: CreateBookingDto) {
    await this.lifecycle.expireStaleReservations();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.status !== 'ACTIVE') {
        throw new ForbiddenException('Аккаунт не может создавать бронирования');
      }
      if (user.role === UserRole.ADMIN) {
        throw new ForbiddenException('Администратор не может создавать бронирования');
      }

      const { car, tariff, options } = await this.resolveQuoteInput(tx, dto);
      if (car.status !== CarStatus.AVAILABLE) {
        throw new BadRequestException('Автомобиль уже занят или недоступен');
      }

      const activeUserBooking = await tx.booking.findFirst({
        where: {
          userId,
          status: { in: [BookingStatus.RESERVED, BookingStatus.ACTIVE] },
        },
      });
      if (activeUserBooking) {
        throw new BadRequestException('У пользователя уже есть активное бронирование или поездка');
      }

      const startAt = this.resolveStartAt(dto.startAt);
      this.validatePlannedUnits(dto.rateType, dto.units, tariff);
      const quote = calculateQuote({ rateType: dto.rateType, units: dto.units, tariff, options });
      const plannedEndAt = this.plannedEndAt(startAt, dto.rateType, quote.units);
      const timing = bookingTiming(startAt);

      const overlap = await tx.booking.findFirst({
        where: {
          carId: car.id,
          status: { in: [BookingStatus.RESERVED, BookingStatus.ACTIVE] },
          startAt: { lt: plannedEndAt },
          plannedEndAt: { gt: startAt },
        },
      });
      if (overlap) {
        throw new BadRequestException('На выбранный период автомобиль уже забронирован');
      }

      const booking = await tx.booking.create({
        data: {
          userId,
          carId: car.id,
          startAt,
          plannedEndAt,
          freeWaitUntil: timing.freeWaitUntil,
          expiresAt: timing.expiresAt,
          status: BookingStatus.RESERVED,
          rateType: dto.rateType,
          baseAmount: quote.baseAmount,
          optionsAmount: quote.optionsAmount,
          waitAmount: 0,
          cancellationAmount: 0,
          totalAmount: quote.totalAmount,
          options: {
            create: options.map((option) => ({
              optionId: option.id,
              priceSnapshot: option.price,
              metadata: { name: option.name, pricingType: option.pricingType },
            })),
          },
        },
        include: this.bookingInclude(),
      });

      const reserved = await tx.car.updateMany({
        where: { id: car.id, status: CarStatus.AVAILABLE },
        data: { status: CarStatus.RESERVED },
      });
      if (reserved.count !== 1) {
        throw new BadRequestException('Автомобиль уже занят или недоступен');
      }
      return booking;
    });
  }

  async active(userId: string) {
    await this.lifecycle.expireStaleReservations();

    return this.prisma.booking.findFirst({
      where: { userId, status: { in: [BookingStatus.RESERVED, BookingStatus.ACTIVE] } },
      include: this.bookingInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async start(userId: string, id: string) {
    await this.lifecycle.expireStaleReservations();

    const booking = await this.prisma.booking.findFirst({ where: { id, userId } });
    if (!booking) {
      throw new NotFoundException('Бронирование не найдено');
    }
    if (booking.status !== BookingStatus.RESERVED) {
      throw new BadRequestException('Можно начать только забронированную поездку');
    }

    const now = new Date();
    const timing = bookingTiming(booking.startAt);
    if (!canStartBooking(booking.startAt, booking.expiresAt, now)) {
      if (now < timing.startWindowAt) {
        throw new BadRequestException(
          `Поездку можно начать не раньше чем за ${START_LEAD_MINUTES} минут до запланированного старта`,
        );
      }

      throw new BadRequestException('Бронирование истекло без старта');
    }

    const waitAmount = waitAmountFor(booking.startAt, now);
    const plannedDurationMs = Math.max(1, booking.plannedEndAt.getTime() - booking.startAt.getTime());
    const plannedEndAt = new Date(now.getTime() + plannedDurationMs);

    await this.prisma.car.update({ where: { id: booking.carId }, data: { status: CarStatus.ACTIVE } });
    return this.prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.ACTIVE,
        actualStartAt: now,
        plannedEndAt,
        waitAmount,
        cancellationAmount: 0,
        totalAmount: booking.baseAmount + booking.optionsAmount + waitAmount,
      },
      include: this.bookingInclude(),
    });
  }

  async cancel(userId: string, id: string) {
    await this.lifecycle.expireStaleReservations();

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id, userId },
        include: {
          car: { include: { model: true, category: true, tariffs: { where: { isActive: true } } } },
          user: true,
          options: { include: { option: true } },
          receipt: true,
        },
      });

      if (!booking) {
        throw new NotFoundException('Бронирование не найдено');
      }
      if (booking.status !== BookingStatus.RESERVED) {
        throw new BadRequestException('Отменить можно только бронирование до старта');
      }

      const now = new Date();
      const charge = cancellationChargeFor(booking.startAt, booking.createdAt, now);
      const lines = [
        ...(charge.cancellationAmount > 0
          ? [{ label: 'Поздняя отмена брони', amount: charge.cancellationAmount }]
          : []),
        ...(charge.waitAmount > 0 ? [{ label: 'Платное ожидание до отмены', amount: charge.waitAmount }] : []),
      ];

      await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: now,
          waitAmount: charge.waitAmount,
          cancellationAmount: charge.cancellationAmount,
          totalAmount: charge.totalAmount,
        },
      });
      await tx.car.update({ where: { id: booking.carId }, data: { status: CarStatus.AVAILABLE } });

      let receipt = booking.receipt;
      if (charge.totalAmount > 0 && !receipt) {
        const tariff = this.primaryTariff(booking.car);
        receipt = await tx.receipt.create({
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
            lines,
            totalAmount: charge.totalAmount,
          },
        });
      }

      const updatedBooking = await tx.booking.findUniqueOrThrow({
        where: { id },
        include: this.bookingInclude(),
      });

      return {
        booking: updatedBooking,
        receipt,
        cancellation: charge,
      };
    });
  }

  async finish(userId: string, id: string) {
    await this.lifecycle.expireStaleReservations();

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id, userId },
        include: {
          car: { include: { model: true, category: true, tariffs: { where: { isActive: true } } } },
          user: true,
          options: { include: { option: true } },
          receipt: true,
        },
      });

      if (!booking) {
        throw new NotFoundException('Поездка не найдена');
      }
      if (booking.receipt) {
        return booking.receipt;
      }
      if (booking.status !== BookingStatus.ACTIVE) {
        throw new BadRequestException('Завершить можно только активную поездку');
      }

      const tariff = this.primaryTariff(booking.car);
      const actualStartAt = booking.actualStartAt ?? booking.startAt;
      const actualEndAt = new Date();
      const units = unitsFromDuration(booking.rateType, actualStartAt, actualEndAt, tariff);
      const options: QuoteOption[] = booking.options.map((bookingOption) => ({
        id: bookingOption.optionId,
        name: bookingOption.option.name,
        price: bookingOption.priceSnapshot,
        pricingType: bookingOption.option.pricingType,
      }));
      const quote = calculateQuote({ rateType: booking.rateType, units, tariff, options });
      const lines = [
        {
          label: this.rentalLineLabel(booking.rateType, quote.units),
          amount: quote.baseAmount,
        },
        ...quote.optionLines.map((line) => ({ label: line.label, amount: line.amount })),
        ...(booking.waitAmount > 0 ? [{ label: 'Платное ожидание', amount: booking.waitAmount }] : []),
      ];

      const completed = await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.COMPLETED,
          actualEndAt,
          baseAmount: quote.baseAmount,
          optionsAmount: quote.optionsAmount,
          totalAmount: quote.totalAmount + booking.waitAmount,
        },
      });

      await tx.car.update({ where: { id: booking.carId }, data: { status: CarStatus.AVAILABLE } });

      return tx.receipt.create({
        data: {
          bookingId: completed.id,
          number: `CS-${Date.now()}-${completed.id.slice(-4).toUpperCase()}`,
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
          lines,
          totalAmount: quote.totalAmount + booking.waitAmount,
        },
      });
    });
  }

  private async resolveQuoteInput(tx: Tx | PrismaService, dto: QuoteDto) {
    const car = await tx.car.findUnique({
      where: { id: dto.carId },
      include: { model: true, tariffs: { where: { isActive: true } } },
    });
    if (!car) {
      throw new NotFoundException('Автомобиль не найден');
    }

    const tariff = this.primaryTariff(car);
    const options = dto.optionIds?.length
      ? await tx.extraOption.findMany({
          where: { id: { in: dto.optionIds }, isActive: true, code: { not: 'DELAYED_START' } },
        })
      : [];

    return { car, tariff, options };
  }

  private primaryTariff(car: { tariffs: QuoteTariff[] }) {
    const tariff = car.tariffs[0];
    if (!tariff) {
      throw new BadRequestException('Для автомобиля не настроен тариф');
    }
    return tariff;
  }

  private resolveStartAt(value?: string) {
    const startAt = value ? new Date(value) : new Date();
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Некорректное время старта');
    }

    const minStartAt = new Date(Date.now() - 60_000);
    if (startAt < minStartAt) {
      throw new BadRequestException('Время старта не может быть в прошлом');
    }

    return startAt;
  }

  private plannedEndAt(startAt: Date, rateType: RateType, units: number) {
    const hours = rateType === RateType.HOURLY ? units : units * 24;
    return new Date(startAt.getTime() + hours * 60 * 60 * 1000);
  }

  private validatePlannedUnits(rateType: RateType, units: number, tariff: QuoteTariff) {
    const bounds = unitBoundsFor(rateType, tariff);
    if (units < bounds.min || units > bounds.max) {
      const label = rateType === RateType.HOURLY ? 'часов' : 'дней';
      throw new BadRequestException(`Длительность должна быть от ${bounds.min} до ${bounds.max} ${label}`);
    }
  }

  private rentalLineLabel(rateType: RateType, units: number) {
    if (rateType === RateType.HOURLY) {
      return `Аренда, ${units} ч.`;
    }
    if (rateType === RateType.DAILY) {
      return `Аренда, ${units} сут.`;
    }
    return `Длительная аренда, ${units} сут.`;
  }

  private bookingInclude() {
    return {
      car: { include: { model: true, category: true, tariffs: { where: { isActive: true } } } },
      options: { include: { option: true } },
      receipt: true,
    } satisfies Prisma.BookingInclude;
  }
}
