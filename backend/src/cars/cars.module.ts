import { Module } from '@nestjs/common';
import { BookingLifecycleService } from '../bookings/booking-lifecycle.service';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';

@Module({
  controllers: [CarsController],
  providers: [CarsService, BookingLifecycleService],
})
export class CarsModule {}
