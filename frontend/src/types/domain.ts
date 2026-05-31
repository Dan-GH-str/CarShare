export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BLOCKED';
export type CarStatus = 'AVAILABLE' | 'RESERVED' | 'ACTIVE' | 'MAINTENANCE' | 'DISABLED';
export type RateType = 'HOURLY' | 'DAILY' | 'LONG_TERM';
export type PricingType = 'FIXED' | 'PER_HOUR' | 'PER_DAY';
export type BookingStatus = 'RESERVED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type ModerationStatus = 'PENDING' | 'PUBLISHED' | 'HIDDEN';

export type User = {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  middleName?: string | null;
  displayName?: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  stats?: {
    tripsCount: number;
    totalSpend: number;
    lastCar: string | null;
  };
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isActive: boolean;
};

export type CarModel = {
  id: string;
  brand: string;
  name: string;
  trim: string;
  transmission: string;
  fuelType: string;
  driveType: string;
  seats: number;
  year: number;
  features: string[];
  description: string;
};

export type Tariff = {
  id?: string;
  hourlyPrice: number;
  dailyPrice: number;
  longTermDailyPrice: number;
  longTermFromDays: number;
};

export type ExtraOption = {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  pricingType: PricingType;
  isActive: boolean;
};

export type Car = {
  id: string;
  title: string;
  plateNumber: string;
  color: string;
  status: CarStatus;
  latitude: number;
  longitude: number;
  address: string;
  mileage: number;
  images: string[];
  category: Category;
  model: CarModel;
  tariff: Tariff;
  options?: ExtraOption[];
  rating: number;
  reviewCount: number;
};

export type CarsResponse = {
  items: Car[];
  total: number;
  page: number;
  limit: number;
};

export type MapCar = {
  id: string;
  title: string;
  trim: string;
  category: Category;
  latitude: number;
  longitude: number;
  address: string;
  hourlyPrice: number;
  image: string;
};

export type Quote = {
  carId: string;
  carTitle: string;
  rateType: RateType;
  units: number;
  billableHours: number;
  billableDays: number;
  baseAmount: number;
  optionsAmount: number;
  waitAmount: number;
  cancellationAmount: number;
  totalAmount: number;
  startAt: string;
  plannedEndAt: string;
  freeWaitUntil: string;
  expiresAt: string;
  waitPricePerMinute: number;
  freeWaitMinutes: number;
  lateCancellationFee: number;
  startLeadMinutes: number;
  optionLines: Array<{ optionId: string; label: string; amount: number; pricingType: PricingType }>;
};

export type Booking = {
  id: string;
  startAt: string;
  plannedEndAt: string;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  cancelledAt?: string | null;
  freeWaitUntil: string;
  expiresAt: string;
  status: BookingStatus;
  rateType: RateType;
  baseAmount: number;
  optionsAmount: number;
  waitAmount: number;
  cancellationAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  car: {
    id: string;
    color: string;
    plateNumber: string;
    model: { brand: string; name: string; trim: string };
    category?: Category;
  };
  options: Array<{ option: ExtraOption; priceSnapshot: number }>;
  receipt?: Receipt | null;
};

export type Receipt = {
  id: string;
  number: string;
  issuedAt: string;
  carSnapshot: any;
  userSnapshot: any;
  tariffSnapshot: Tariff;
  lines: Array<{ label: string; amount: number }>;
  totalAmount: number;
};

export type CancellationDetails = {
  reason: 'FREE_GRACE' | 'FREE_EARLY' | 'LATE_BEFORE_START' | 'FREE_WAIT' | 'PAID_WAIT';
  cancellationAmount: number;
  waitAmount: number;
  totalAmount: number;
};

export type CancelBookingResult = {
  booking: Booking;
  receipt?: Receipt | null;
  cancellation: CancellationDetails;
};

export type TripsResponse = {
  active: Booking | null;
  history: Booking[];
};

export type Review = {
  id: string;
  rating: number;
  text: string;
  moderationStatus: ModerationStatus;
  createdAt: string;
  user: { lastName: string; firstName: string; middleName?: string | null; displayName?: string };
};
