import {
  Booking,
  CancelBookingResult,
  Car,
  CarModel,
  CarStatus,
  CarsResponse,
  Category,
  MapCar,
  Quote,
  RateType,
  Receipt,
  Review,
  TripsResponse,
  User,
} from '../types/domain';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const accessKey = 'carshare.accessToken';
const refreshKey = 'carshare.refreshToken';

type RequestOptions = Omit<RequestInit, 'body'> & {
  auth?: boolean;
  body?: BodyInit | object | null;
};

export type CreateCarPayload = {
  modelId: string;
  categoryId: string;
  vin: string;
  plateNumber: string;
  color: string;
  status?: CarStatus;
  latitude: number;
  longitude: number;
  address: string;
  mileage: number;
  images: string[];
  hourlyPrice: number;
  dailyPrice: number;
  longTermDailyPrice: number;
  longTermFromDays?: number;
};

export type UploadedImage = {
  filename: string;
  path: string;
  url: string;
};

export type CreateModelPayload = {
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

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const tokenStorage = {
  get accessToken() {
    return localStorage.getItem(accessKey);
  },
  get refreshToken() {
    return localStorage.getItem(refreshKey);
  },
  set(accessToken: string, refreshToken: string) {
    localStorage.setItem(accessKey, accessToken);
    localStorage.setItem(refreshKey, refreshToken);
  },
  clear() {
    localStorage.removeItem(accessKey);
    localStorage.removeItem(refreshKey);
  },
};

async function request<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  const hasJsonBody = options.body && !(options.body instanceof FormData);

  if (hasJsonBody) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.auth !== false && tokenStorage.accessToken) {
    headers.set('Authorization', `Bearer ${tokenStorage.accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body: hasJsonBody ? JSON.stringify(options.body) : (options.body as BodyInit | null | undefined),
    });
  } catch (error) {
    throw new ApiError('Сервер недоступен или не отвечает', 0, error);
  }

  if (response.status === 401 && retry && tokenStorage.refreshToken) {
    try {
      const refreshed = await request<{ accessToken: string; refreshToken: string; user: User }>(
        '/auth/refresh',
        {
          method: 'POST',
          auth: false,
          body: { refreshToken: tokenStorage.refreshToken },
        },
        false,
      );
      tokenStorage.set(refreshed.accessToken, refreshed.refreshToken);
      return request<T>(path, options, false);
    } catch {
      tokenStorage.clear();
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Ошибка запроса' }));
    throw new ApiError(Array.isArray(error.message) ? error.message.join(', ') : error.message, response.status, error);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  request,
  auth: {
    login: (body: { email: string; password: string }) =>
      request<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
        method: 'POST',
        auth: false,
        body,
      }),
    register: (body: {
      email: string;
      password: string;
      lastName: string;
      firstName: string;
      middleName?: string;
      phone: string;
    }) =>
      request<{ accessToken: string; refreshToken: string; user: User }>('/auth/register', {
        method: 'POST',
        auth: false,
        body,
      }),
    me: () => request<User>('/auth/me'),
    logout: () =>
      request('/auth/logout', {
        method: 'POST',
        body: { refreshToken: tokenStorage.refreshToken },
      }),
  },
  users: {
    profile: () => request<User>('/users/me'),
    update: (body: { lastName?: string; firstName?: string; middleName?: string; phone?: string }) =>
      request<User>('/users/me', { method: 'PATCH', body }),
  },
  categories: () => request<Category[]>('/categories', { auth: false }),
  cars: {
    list: (params: URLSearchParams) => request<CarsResponse>(`/cars?${params.toString()}`, { auth: false }),
    map: (params: URLSearchParams) => request<MapCar[]>(`/cars/map?${params.toString()}`, { auth: false }),
    byId: (id: string) => request<Car>(`/cars/${id}`, { auth: false }),
    reviews: (id: string) => request<Review[]>(`/cars/${id}/reviews`, { auth: false }),
    createReview: (id: string, body: { rating: number; text: string }) =>
      request<Review>(`/cars/${id}/reviews`, { method: 'POST', body }),
  },
  bookings: {
    quote: (body: { carId: string; rateType: RateType; units: number; optionIds: string[]; startAt?: string }) =>
      request<Quote>('/bookings/quote', { method: 'POST', auth: false, body }),
    create: (body: { carId: string; rateType: RateType; units: number; optionIds: string[]; startAt?: string }) =>
      request<Booking>('/bookings', { method: 'POST', body }),
    active: () => request<Booking | null>('/bookings/active'),
    start: (id: string) => request<Booking>(`/bookings/${id}/start`, { method: 'POST' }),
    cancel: (id: string) => request<CancelBookingResult>(`/bookings/${id}/cancel`, { method: 'POST' }),
    finish: (id: string) => request<Receipt>(`/bookings/${id}/finish`, { method: 'POST' }),
  },
  trips: {
    my: () => request<TripsResponse>('/trips/my'),
  },
  receipts: {
    byId: (id: string) => request<Receipt>(`/receipts/${id}`),
  },
  serviceReviews: {
    create: (body: { rating: number; text: string }) =>
      request('/service-reviews', { method: 'POST', body }),
  },
  admin: {
    dashboard: () =>
      request<{ users: number; cars: number; activeBookings: number; completedTrips: number; revenue: number }>(
        '/admin/dashboard',
      ),
    users: () => request<User[]>('/admin/users'),
    patchUser: (id: string, body: Partial<User>) => request<User>(`/admin/users/${id}`, { method: 'PATCH', body }),
    cars: () => request<any[]>('/admin/cars'),
    createCar: (body: CreateCarPayload) => request<Car>(`/admin/cars`, { method: 'POST', body }),
    deleteCar: (id: string) => request(`/admin/cars/${id}`, { method: 'DELETE' }),
    uploadCarImage: (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return request<UploadedImage>('/admin/uploads/car-images', { method: 'POST', body });
    },
    patchCar: (id: string, body: Record<string, unknown>) =>
      request(`/admin/cars/${id}`, { method: 'PATCH', body }),
    categories: () => request<Category[]>('/admin/categories'),
    models: () => request<CarModel[]>('/admin/models'),
    createModel: (body: CreateModelPayload) => request<CarModel>('/admin/models', { method: 'POST', body }),
    deleteModel: (id: string) => request(`/admin/models/${id}`, { method: 'DELETE' }),
    bookings: () => request<any[]>('/admin/bookings'),
    reviews: () => request<{ carReviews: any[]; serviceReviews: any[] }>('/admin/reviews'),
    patchCarReview: (id: string, body: { moderationStatus: string }) =>
      request(`/admin/reviews/cars/${id}`, { method: 'PATCH', body }),
  },
};
