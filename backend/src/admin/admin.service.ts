import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, CarStatus, ModerationStatus, Prisma, UserStatus } from '@prisma/client';
import { BookingLifecycleService } from '../bookings/booking-lifecycle.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarDto, CreateModelDto, UpdateCarDto, UpdateModelDto } from './dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: BookingLifecycleService,
  ) {}

  async dashboard() {
    await this.lifecycle.expireStaleReservations();

    const [users, cars, activeBookings, completedTrips, revenue] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.car.count({ where: { status: { not: CarStatus.DISABLED } } }),
      this.prisma.booking.count({ where: { status: BookingStatus.ACTIVE } }),
      this.prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      this.prisma.receipt.aggregate({ _sum: { totalAmount: true } }),
    ]);

    return {
      users,
      cars,
      activeBookings,
      completedTrips,
      revenue: revenue._sum.totalAmount ?? 0,
    };
  }

  users(search?: string) {
    return this.prisma.user.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { middleName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
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
      orderBy: { createdAt: 'desc' },
    });
  }

  updateUser(id: string, data: { status?: UserStatus; role?: 'USER' | 'ADMIN' }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        status: data.status,
        role: data.role,
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
  }

  cars() {
    return this.prisma.car.findMany({
      include: {
        model: true,
        category: true,
        tariffs: { where: { isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCar(data: CreateCarDto) {
    await this.ensureCarReferences(data.modelId, data.categoryId);
    await this.ensureCarIdentityAvailable(data.vin, data.plateNumber);

    return this.prisma.$transaction(async (tx) => {
      const car = await tx.car.create({
        data: this.toCarCreateInput(data),
      });

      await tx.tariff.create({
        data: {
          carId: car.id,
          hourlyPrice: data.hourlyPrice,
          dailyPrice: data.dailyPrice,
          longTermDailyPrice: data.longTermDailyPrice,
          longTermFromDays: data.longTermFromDays ?? 7,
        },
      });

      return tx.car.findUniqueOrThrow({
        where: { id: car.id },
        include: { model: true, category: true, tariffs: true },
      });
    });
  }

  async updateCar(id: string, data: UpdateCarDto) {
    await this.ensureCarReferences(data.modelId, data.categoryId);

    return this.prisma.car.update({
      where: { id },
      data: this.toCarUpdateInput(data),
      include: { model: true, category: true, tariffs: true },
    });
  }

  async deleteCar(id: string) {
    const history = await this.prisma.booking.count({ where: { carId: id } });
    if (history > 0) {
      return this.prisma.car.update({ where: { id }, data: { status: CarStatus.DISABLED } });
    }
    return this.prisma.car.delete({ where: { id } });
  }

  categories() {
    return this.prisma.carCategory.findMany({ orderBy: { name: 'asc' } });
  }

  createCategory(data: Prisma.CarCategoryCreateInput) {
    return this.prisma.carCategory.create({ data });
  }

  updateCategory(id: string, data: Prisma.CarCategoryUpdateInput) {
    return this.prisma.carCategory.update({ where: { id }, data });
  }

  deleteCategory(id: string) {
    return this.prisma.carCategory.update({ where: { id }, data: { isActive: false } });
  }

  models() {
    return this.prisma.carModel.findMany({ orderBy: [{ brand: 'asc' }, { name: 'asc' }] });
  }

  async createModel(data: CreateModelDto) {
    const brand = data.brand.trim();
    const name = data.name.trim();
    const trim = data.trim.trim();
    const existing = await this.prisma.carModel.findFirst({
      where: {
        brand: { equals: brand, mode: 'insensitive' },
        name: { equals: name, mode: 'insensitive' },
        trim: { equals: trim, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Модель с такой маркой, названием и комплектацией уже существует');
    }

    return this.prisma.carModel.create({ data: this.toCarModelCreateInput(data) });
  }

  updateModel(id: string, data: UpdateModelDto) {
    return this.prisma.carModel.update({ where: { id }, data: this.toCarModelUpdateInput(data) });
  }

  async deleteModel(id: string) {
    const cars = await this.prisma.car.count({ where: { modelId: id } });
    if (cars > 0) {
      throw new ConflictException('Нельзя удалить модель, пока с ней связаны автомобили');
    }
    return this.prisma.carModel.delete({ where: { id } });
  }

  tariffs() {
    return this.prisma.tariff.findMany({
      include: { car: { include: { model: true } }, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createTariff(data: Prisma.TariffCreateInput) {
    return this.prisma.tariff.create({ data });
  }

  updateTariff(id: string, data: Prisma.TariffUpdateInput) {
    return this.prisma.tariff.update({ where: { id }, data });
  }

  deleteTariff(id: string) {
    return this.prisma.tariff.update({ where: { id }, data: { isActive: false } });
  }

  options() {
    return this.prisma.extraOption.findMany({ orderBy: { name: 'asc' } });
  }

  createOption(data: Prisma.ExtraOptionCreateInput) {
    return this.prisma.extraOption.create({ data });
  }

  updateOption(id: string, data: Prisma.ExtraOptionUpdateInput) {
    return this.prisma.extraOption.update({ where: { id }, data });
  }

  deleteOption(id: string) {
    return this.prisma.extraOption.update({ where: { id }, data: { isActive: false } });
  }

  async bookings() {
    await this.lifecycle.expireStaleReservations();

    return this.prisma.booking.findMany({
      include: {
        user: { select: { lastName: true, firstName: true, middleName: true, email: true } },
        car: { include: { model: true } },
        receipt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateBooking(id: string, data: { status?: BookingStatus }) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Бронирование не найдено');
    }

    const updated = await this.prisma.booking.update({ where: { id }, data: { status: data.status } });
    if (
      data.status === BookingStatus.CANCELLED ||
      data.status === BookingStatus.COMPLETED ||
      data.status === BookingStatus.EXPIRED
    ) {
      await this.prisma.car.update({ where: { id: booking.carId }, data: { status: CarStatus.AVAILABLE } });
    }
    if (data.status === BookingStatus.ACTIVE) {
      await this.prisma.car.update({ where: { id: booking.carId }, data: { status: CarStatus.ACTIVE } });
    }
    return updated;
  }

  async reviews() {
    const [carReviews, serviceReviews] = await Promise.all([
      this.prisma.carReview.findMany({
        include: {
          user: { select: { lastName: true, firstName: true, middleName: true, email: true } },
          car: { include: { model: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceReview.findMany({
        include: { user: { select: { lastName: true, firstName: true, middleName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { carReviews, serviceReviews };
  }

  patchCarReview(id: string, data: { moderationStatus: ModerationStatus }) {
    if (!data.moderationStatus) {
      throw new BadRequestException('Нужен статус модерации');
    }
    return this.prisma.carReview.update({ where: { id }, data });
  }

  patchServiceReview(id: string, data: { moderationStatus: ModerationStatus }) {
    if (!data.moderationStatus) {
      throw new BadRequestException('Нужен статус модерации');
    }
    return this.prisma.serviceReview.update({ where: { id }, data });
  }

  private toCarCreateInput(data: CreateCarDto): Prisma.CarCreateInput {
    return {
      model: { connect: { id: data.modelId } },
      category: { connect: { id: data.categoryId } },
      vin: data.vin.trim(),
      plateNumber: data.plateNumber.trim(),
      color: data.color.trim(),
      status: data.status ?? CarStatus.AVAILABLE,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address.trim(),
      mileage: data.mileage,
      images: this.normalizeImages(data.images),
    };
  }

  private toCarUpdateInput(data: UpdateCarDto): Prisma.CarUpdateInput {
    return {
      model: data.modelId ? { connect: { id: data.modelId } } : undefined,
      category: data.categoryId ? { connect: { id: data.categoryId } } : undefined,
      vin: data.vin?.trim(),
      plateNumber: data.plateNumber?.trim(),
      color: data.color?.trim(),
      status: data.status,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address?.trim(),
      mileage: data.mileage,
      images: data.images ? this.normalizeImages(data.images) : undefined,
    };
  }

  private normalizeImages(images: string[]) {
    const normalized = images.map((image) => image.trim()).filter(Boolean);
    if (!normalized.length) {
      throw new BadRequestException('Нужно добавить хотя бы одно изображение');
    }
    return normalized;
  }

  private async ensureCarReferences(modelId?: string, categoryId?: string) {
    const [model, category] = await Promise.all([
      modelId ? this.prisma.carModel.findUnique({ where: { id: modelId }, select: { id: true } }) : null,
      categoryId ? this.prisma.carCategory.findUnique({ where: { id: categoryId }, select: { id: true } }) : null,
    ]);

    if (modelId && !model) {
      throw new NotFoundException('Модель авто не найдена');
    }
    if (categoryId && !category) {
      throw new NotFoundException('Категория авто не найдена');
    }
  }

  private async ensureCarIdentityAvailable(vin: string, plateNumber: string) {
    const normalizedVin = vin.trim();
    const normalizedPlateNumber = plateNumber.trim();
    const existing = await this.prisma.car.findFirst({
      where: {
        OR: [{ vin: normalizedVin }, { plateNumber: normalizedPlateNumber }],
      },
      select: { vin: true, plateNumber: true },
    });

    if (!existing) {
      return;
    }

    if (existing.vin === normalizedVin && existing.plateNumber === normalizedPlateNumber) {
      throw new ConflictException('Автомобиль с таким VIN и госномером уже существует');
    }
    if (existing.vin === normalizedVin) {
      throw new ConflictException('Автомобиль с таким VIN уже существует');
    }
    throw new ConflictException('Автомобиль с таким госномером уже существует');
  }

  private toCarModelCreateInput(data: CreateModelDto): Prisma.CarModelCreateInput {
    return {
      brand: data.brand.trim(),
      name: data.name.trim(),
      trim: data.trim.trim(),
      transmission: data.transmission,
      fuelType: data.fuelType,
      driveType: data.driveType,
      seats: data.seats,
      year: data.year,
      features: this.normalizeFeatures(data.features),
      description: data.description.trim(),
    };
  }

  private toCarModelUpdateInput(data: UpdateModelDto): Prisma.CarModelUpdateInput {
    return {
      brand: data.brand?.trim(),
      name: data.name?.trim(),
      trim: data.trim?.trim(),
      transmission: data.transmission,
      fuelType: data.fuelType,
      driveType: data.driveType,
      seats: data.seats,
      year: data.year,
      features: data.features ? this.normalizeFeatures(data.features) : undefined,
      description: data.description?.trim(),
    };
  }

  private normalizeFeatures(features: string[]) {
    return features.map((feature) => feature.trim()).filter(Boolean);
  }
}
