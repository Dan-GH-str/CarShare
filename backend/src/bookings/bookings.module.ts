import { Module } from '@nestjs/common';
import { BookingLifecycleService } from './booking-lifecycle.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, BookingLifecycleService],
})
export class BookingsModule {}
