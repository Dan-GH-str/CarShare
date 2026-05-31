import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Check, Star } from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { Field, SelectField, TextAreaField } from '../components/Field';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { RateType } from '../types/domain';
import { formatPersonName } from '../utils/name';

const RATE_TABS: Array<{ value: RateType; label: string }> = [
  { value: 'HOURLY', label: 'Часы' },
  { value: 'DAILY', label: 'Сутки' },
  { value: 'LONG_TERM', label: 'Аренда' },
];

const RATE_UNIT_LIMITS: Record<RateType, { min: number; max: number; fieldLabel: string; hint: string }> = {
  HOURLY: {
    min: 1,
    max: 23,
    fieldLabel: 'Количество часов',
    hint: 'От 1 до 23 часов включительно.',
  },
  DAILY: {
    min: 1,
    max: 6,
    fieldLabel: 'Количество суток',
    hint: 'От 1 до 6 суток включительно.',
  },
  LONG_TERM: {
    min: 7,
    max: 30,
    fieldLabel: 'Срок аренды в днях',
    hint: 'От 7 до 30 дней включительно.',
  },
};

export function CarPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [rateType, setRateType] = useState<RateType>('HOURLY');
  const [units, setUnits] = useState(2);
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [startMode, setStartMode] = useState<'now' | 'scheduled'>('now');
  const [startAtLocal, setStartAtLocal] = useState(() => toDatetimeLocal(addMinutes(new Date(), 30)));
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const unitLimits = RATE_UNIT_LIMITS[rateType];
  const startAt = useMemo(
    () => (startMode === 'scheduled' ? datetimeLocalToIso(startAtLocal) : undefined),
    [startAtLocal, startMode],
  );
  const bookingPayload = useMemo(
    () => ({
      carId: id,
      rateType,
      units,
      optionIds,
      ...(startAt ? { startAt } : {}),
    }),
    [id, optionIds, rateType, startAt, units],
  );

  const carQuery = useQuery({ queryKey: ['car', id], queryFn: () => api.cars.byId(id), enabled: Boolean(id) });
  const reviewsQuery = useQuery({
    queryKey: ['car-reviews', id],
    queryFn: () => api.cars.reviews(id),
    enabled: Boolean(id),
  });

  const quoteQuery = useQuery({
    queryKey: ['quote', id, rateType, units, optionIds.join(','), startAt ?? 'now'],
    queryFn: () => api.bookings.quote(bookingPayload),
    enabled: Boolean(id && carQuery.data && (startMode === 'now' || startAt)),
  });

  const createBooking = useMutation({
    mutationFn: () => api.bookings.create(bookingPayload),
    onSuccess: () => navigate('/trips'),
  });

  const createReview = useMutation({
    mutationFn: () => api.cars.createReview(id, { rating: reviewRating, text: reviewText }),
    onSuccess: async () => {
      setReviewText('');
      await queryClient.invalidateQueries({ queryKey: ['car-reviews', id] });
    },
  });

  const car = carQuery.data;
  const isAdmin = user?.role === 'ADMIN';
  const selectedOptions = useMemo(
    () => car?.options?.filter((option) => optionIds.includes(option.id)) ?? [],
    [car?.options, optionIds],
  );

  if (carQuery.isLoading) {
    return <div className="stateBlock">Загружаем автомобиль...</div>;
  }
  if (!car) {
    return <div className="stateBlock error">Автомобиль не найден</div>;
  }

  function toggleOption(optionId: string) {
    setOptionIds((current) =>
      current.includes(optionId) ? current.filter((id) => id !== optionId) : current.concat(optionId),
    );
  }

  function changeRateType(nextRateType: RateType) {
    setRateType(nextRateType);
    setUnits((current) => clampUnits(current, RATE_UNIT_LIMITS[nextRateType]));
  }

  function changeUnits(value: number) {
    setUnits(clampUnits(value, unitLimits));
  }

  function book() {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (isAdmin) {
      return;
    }
    if (startMode === 'scheduled' && !startAt) {
      return;
    }
    createBooking.mutate();
  }

  return (
    <section className="page carPage">
      <Link to="/" className="backLink">
        <ArrowLeft size={18} />
        Каталог
      </Link>

      <div className="carHero">
        <img src={car.images[0]} alt={car.title} />
        <div className="heroBadges">
          <span className="chip">{car.category.name}</span>
          <StatusBadge status={car.status} />
        </div>
      </div>

      <div className="carTitleBlock">
        <div>
          <h1>{car.title}</h1>
          <p>{car.model.trim}</p>
        </div>
        <span className="ratingPill">
          <Star size={16} />
          {car.rating}
        </span>
      </div>

      <div className="specGrid">
        <Spec label="Коробка" value={car.model.transmission === 'AUTOMATIC' ? 'Автомат' : 'Механика'} />
        <Spec label="Топливо" value={fuelLabel(car.model.fuelType)} />
        <Spec label="Мест" value={`${car.model.seats}`} />
        <Spec label="Год" value={`${car.model.year}`} />
        <Spec label="Цвет" value={car.color} />
        <Spec label="Пробег" value={`${car.mileage.toLocaleString('ru-RU')} км`} />
      </div>

      <section className="sectionBlock">
        <h2>Описание</h2>
        <p className="smallNote">{car.model.description}</p>
      </section>

      <section className="sectionBlock">
        <h2>Комплектация</h2>
        <div className="featureList">
          {car.model.features.map((feature) => (
            <span key={feature}>{feature}</span>
          ))}
        </div>
      </section>

      <section className="bookingPanel">
        <header>
          <div>
            <p className="eyebrow">Бронирование</p>
            <h2>Расчет поездки</h2>
          </div>
          <CalendarClock size={22} />
        </header>

        <div className="rateTabs">
          {RATE_TABS.map(({ value, label }) => (
            <button
              key={value}
              className={rateType === value ? 'active' : ''}
              onClick={() => changeRateType(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <Field
          label={unitLimits.fieldLabel}
          type="number"
          min={unitLimits.min}
          max={unitLimits.max}
          step={1}
          value={units}
          hint={unitLimits.hint}
          onChange={(event) => changeUnits(Number(event.target.value))}
        />

        <div className="startPicker">
          <div className="startTabs">
            <button className={startMode === 'now' ? 'active' : ''} onClick={() => setStartMode('now')}>
              Сейчас
            </button>
            <button className={startMode === 'scheduled' ? 'active' : ''} onClick={() => setStartMode('scheduled')}>
              Запланировать
            </button>
          </div>
          {startMode === 'scheduled' ? (
            <Field
              label="Дата и время старта"
              type="datetime-local"
              min={toDatetimeLocal(new Date())}
              value={startAtLocal}
              hint="Поездку можно будет начать за 10 минут до выбранного времени."
              onChange={(event) => setStartAtLocal(event.target.value)}
            />
          ) : (
            <p className="smallNote">Автомобиль будет закреплен за вами сразу, а поездка начнется после нажатия "Начать поездку".</p>
          )}
        </div>

        <div className="optionList">
          {car.options?.map((option) => (
            <label key={option.id} className="optionRow">
              <input type="checkbox" checked={optionIds.includes(option.id)} onChange={() => toggleOption(option.id)} />
              <span>
                <strong>{option.name}</strong>
                <small>{option.description}</small>
              </span>
              <b>{option.price.toLocaleString('ru-RU')} ₽</b>
            </label>
          ))}
        </div>

        <div className="quoteBox">
          <span>Итого</span>
          <strong>{(quoteQuery.data?.totalAmount ?? 0).toLocaleString('ru-RU')} ₽</strong>
        </div>
        {quoteQuery.data ? (
          <div className="bookingTimeline">
            <span>Старт: {new Date(quoteQuery.data.startAt).toLocaleString('ru-RU')}</span>
            <span>Бесплатное ожидание до {new Date(quoteQuery.data.freeWaitUntil).toLocaleTimeString('ru-RU')}</span>
            <span>Истечение брони: {new Date(quoteQuery.data.expiresAt).toLocaleTimeString('ru-RU')}</span>
          </div>
        ) : null}
        {selectedOptions.length ? (
          <p className="smallNote">{selectedOptions.map((option) => option.name).join(', ')}</p>
        ) : null}
        {createBooking.isError ? <div className="formError">{createBooking.error.message}</div> : null}
        {isAdmin ? <p className="smallNote">Администратор не может создавать бронирования.</p> : null}
        <Button
          icon={<Check size={18} />}
          onClick={book}
          disabled={
            isAdmin || createBooking.isPending || car.status !== 'AVAILABLE' || (startMode === 'scheduled' && !startAt)
          }
        >
          Забронировать
        </Button>
      </section>

      <section className="sectionBlock">
        <h2>Отзывы</h2>
        <div className="reviews">
          {reviewsQuery.data?.map((review) => (
            <article key={review.id} className="reviewItem">
              <div>
                <strong>{formatPersonName(review.user)}</strong>
                <span>{new Date(review.createdAt).toLocaleDateString('ru-RU')}</span>
              </div>
              <p>{review.text}</p>
              <b>{review.rating}/5</b>
            </article>
          ))}
        </div>
        {user ? (
          <div className="reviewForm">
            <SelectField
              label="Оценка"
              value={reviewRating}
              onChange={(event) => setReviewRating(Number(event.target.value))}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectField>
            <TextAreaField
              label="Отзыв"
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              rows={4}
            />
            {createReview.isError ? <div className="formError">{createReview.error.message}</div> : null}
            <Button onClick={() => createReview.mutate()} disabled={!reviewText.trim() || createReview.isPending}>
              Отправить отзыв
            </Button>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="specItem">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function fuelLabel(fuelType: string) {
  const labels: Record<string, string> = {
    GASOLINE: 'Бензин',
    HYBRID: 'Гибрид',
    ELECTRIC: 'Электро',
  };

  return labels[fuelType] ?? fuelType;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function toDatetimeLocal(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function datetimeLocalToIso(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function clampUnits(value: number, limits: { min: number; max: number }) {
  const rounded = Math.ceil(Number.isFinite(value) ? value : limits.min);
  return Math.min(limits.max, Math.max(limits.min, rounded));
}
