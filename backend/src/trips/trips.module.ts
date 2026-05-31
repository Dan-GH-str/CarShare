import { Module } from '@nestjs/common';
import { BookingLifecycleService } from '../bookings/booking-lifecycle.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  controllers: [TripsController],
  providers: [TripsService, BookingLifecycleService],
})
export class TripsModule {}
