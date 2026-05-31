import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, CarStatus, ModerationStatus, Prisma } from '@prisma/client';
import { BookingLifecycleService } from '../bookings/booking-lifecycle.service';
import { PrismaService } from '../prisma/prisma.service';

const carInclude = {
  model: true,
  category: true,
  tariffs: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
  reviews: {
    where: { moderationStatus: ModerationStatus.PUBLISHED },
    select: { rating: true },
  },
} satisfies Prisma.CarInclude;

type CarWithRelations = Prisma.CarGetPayload<{ include: typeof carInclude }>;

export type CarsQuery = {
  category?: string;
  available?: string;
  driveType?: string;
  color?: string;
  transmission?: string;
  fuelType?: string;
  seats?: string;
  minHourly?: string;
  maxHourly?: string;
  minDaily?: string;
  maxDaily?: string;
  sort?: string;
  page?: string;
  limit?: string;
};

@Injectable()
export class CarsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: BookingLifecycleService,
  ) {}

  async findAll(query: CarsQuery) {
    await this.lifecycle.expireStaleReservations();

    const cars = await this.prisma.car.findMany({
      where: { status: { not: CarStatus.DISABLED } },
      include: carInclude,
      orderBy: { createdAt: 'asc' },
    });

    let items = cars.map((car) => this.serializeCar(car));

    if (query.category && query.category !== 'all') {
      items = items.filter((car) => car.category.slug === query.category);
    }
    if (query.available === 'true') {
      items = items.filter((car) => car.status === CarStatus.AVAILABLE);
    }
    if (query.driveType) {
      items = items.filter((car) => car.model.driveType === query.driveType);
    }
    if (query.transmission) {
      items = items.filter((car) => car.model.transmission === query.transmission);
    }
    if (query.fuelType) {
      items = items.filter((car) => car.model.fuelType === query.fuelType);
    }
    if (query.color) {
      items = items.filter((car) => car.color.toLowerCase().includes(query.color!.toLowerCase()));
    }
    if (query.seats) {
      items = items.filter((car) => car.model.seats === Number(query.seats));
    }
    if (query.minHourly) {
      items = items.filter((car) => car.tariff.hourlyPrice >= Number(query.minHourly));
    }
    if (query.maxHourly) {
      items = items.filter((car) => car.tariff.hourlyPrice <= Number(query.maxHourly));
    }
    if (query.minDaily) {
      items = items.filter((car) => car.tariff.dailyPrice >= Number(query.minDaily));
    }
    if (query.maxDaily) {
      items = items.filter((car) => car.tariff.dailyPrice <= Number(query.maxDaily));
    }

    items = this.sortCars(items, query.sort);

    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)));
    const total = items.length;

    return {
      items: items.slice((page - 1) * limit, page * limit),
      total,
      page,
      limit,
    };
  }

  async map(query: CarsQuery) {
    const result = await this.findAll({ ...query, available: 'true', limit: '100' });
    return result.items.map((car) => ({
      id: car.id,
      title: car.title,
      trim: car.model.trim,
      category: car.category,
      latitude: car.latitude,
      longitude: car.longitude,
      address: car.address,
      hourlyPrice: car.tariff.hourlyPrice,
      image: car.images[0],
    }));
  }

  async findById(id: string) {
    const car = await this.prisma.car.findUnique({ where: { id }, include: carInclude });
    if (!car || car.status === CarStatus.DISABLED) {
      throw new NotFoundException('Автомобиль не найден');
    }

    const options = await this.prisma.extraOption.findMany({
      where: { isActive: true, code: { not: 'DELAYED_START' } },
      orderBy: { name: 'asc' },
    });

    return { ...this.serializeCar(car), options };
  }

  async reviews(carId: string) {
    return this.prisma.carReview.findMany({
      where: { carId, moderationStatus: ModerationStatus.PUBLISHED },
      include: { user: { select: { lastName: true, firstName: true, middleName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReview(userId: string, carId: string, body: { rating: number; text: string }) {
    const booking = await this.prisma.booking.findFirst({
      where: { userId, carId, status: BookingStatus.COMPLETED },
      orderBy: { actualEndAt: 'desc' },
    });

    if (!booking) {
      throw new ForbiddenException('Отзыв можно оставить только после завершенной поездки на этом автомобиле');
    }

    return this.prisma.carReview.create({
      data: {
        userId,
        carId,
        bookingId: booking.id,
        rating: Math.min(5, Math.max(1, Number(body.rating))),
        text: body.text,
        moderationStatus: ModerationStatus.PUBLISHED,
      },
      include: { user: { select: { lastName: true, firstName: true, middleName: true } } },
    });
  }

  private sortCars(items: any[], sort?: string) {
    const sorted = [...items];
    if (sort === 'priceAsc') {
      return sorted.sort((a, b) => a.tariff.hourlyPrice - b.tariff.hourlyPrice);
    }
    if (sort === 'priceDesc') {
      return sorted.sort((a, b) => b.tariff.hourlyPrice - a.tariff.hourlyPrice);
    }
    if (sort === 'rating') {
      return sorted.sort((a, b) => b.rating - a.rating);
    }
    return sorted.sort((a, b) => a.title.localeCompare(b.title));
  }

  private serializeCar(car: CarWithRelations) {
    const tariff = car.tariffs[0] ?? {
      hourlyPrice: 0,
      dailyPrice: 0,
      longTermDailyPrice: 0,
      longTermFromDays: 7,
    };
    const ratings = car.reviews.map((review) => review.rating);
    const rating = ratings.length
      ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1))
      : 4.8;

    return {
      id: car.id,
      title: `${car.model.brand} ${car.model.name}`,
      plateNumber: car.plateNumber,
      color: car.color,
      status: car.status,
      latitude: car.latitude,
      longitude: car.longitude,
      address: car.address,
      mileage: car.mileage,
      images: Array.isArray(car.images) ? (car.images as string[]) : [],
      category: car.category,
      model: {
        id: car.model.id,
        brand: car.model.brand,
        name: car.model.name,
        trim: car.model.trim,
        transmission: car.model.transmission,
        fuelType: car.model.fuelType,
        driveType: car.model.driveType,
        seats: car.model.seats,
        year: car.model.year,
        features: Array.isArray(car.model.features) ? (car.model.features as string[]) : [],
        description: car.model.description,
      },
      tariff,
      rating,
      reviewCount: ratings.length,
    };
  }
}
