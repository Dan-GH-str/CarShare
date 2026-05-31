import { Module } from '@nestjs/common';
import { BookingLifecycleService } from '../bookings/booking-lifecycle.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, BookingLifecycleService],
})
export class AdminModule {}
