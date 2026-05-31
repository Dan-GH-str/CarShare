import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Play, ReceiptText, Square, X } from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/Button';
import { ReceiptModal } from '../components/ReceiptModal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Booking, Receipt } from '../types/domain';

export function TripsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [now, setNow] = useState(() => new Date());
  const tripsQueryKey = ['trips', user?.id] as const;
  const tripsQuery = useQuery({
    queryKey: tripsQueryKey,
    queryFn: api.trips.my,
    enabled: Boolean(user?.id),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const startTrip = useMutation({
    mutationFn: (id: string) => api.bookings.start(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tripsQueryKey }),
  });

  const finishTrip = useMutation({
    mutationFn: (id: string) => api.bookings.finish(id),
    onSuccess: async (result) => {
      setReceipt(result);
      await queryClient.invalidateQueries({ queryKey: tripsQueryKey });
    },
  });

  const cancelBooking = useMutation({
    mutationFn: (id: string) => api.bookings.cancel(id),
    onSuccess: async (result) => {
      setCancelTarget(null);
      if (result.receipt) {
        setReceipt(result.receipt);
      }
      await queryClient.invalidateQueries({ queryKey: tripsQueryKey });
    },
  });

  if (tripsQuery.isLoading) {
    return <div className="stateBlock">Загружаем поездки...</div>;
  }

  const active = tripsQuery.data?.active ?? null;
  const history = tripsQuery.data?.history ?? [];

  return (
    <section className="page tripsPage">
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Поездки</p>
          <h1>Мои поездки</h1>
        </div>
      </div>

      <section className="sectionBlock">
        <h2>Активная</h2>
        {active ? (
          <TripCard booking={active} now={now}>
            {active.status === 'RESERVED' ? (
              <>
                {startTrip.isError ? <div className="formError">{startTrip.error.message}</div> : null}
                <Button
                  icon={<Play size={18} />}
                  onClick={() => startTrip.mutate(active.id)}
                  disabled={startTrip.isPending || !reservationState(active, now).canStart}
                >
                  Начать поездку
                </Button>
                <Button
                  variant="secondary"
                  icon={<Ban size={18} />}
                  onClick={() => setCancelTarget(active)}
                  disabled={cancelBooking.isPending}
                >
                  Отменить
                </Button>
              </>
            ) : (
              <Button
                variant="danger"
                icon={<Square size={18} />}
                onClick={() => finishTrip.mutate(active.id)}
                disabled={finishTrip.isPending}
              >
                Завершить
              </Button>
            )}
          </TripCard>
        ) : (
          <div className="stateBlock compact">Активной поездки нет</div>
        )}
      </section>

      <section className="sectionBlock">
        <h2>История</h2>
        <div className="tripList">
          {history.map((booking) => (
            <TripCard key={booking.id} booking={booking} now={now}>
              {booking.receipt ? (
                <Button
                  variant="secondary"
                  icon={<ReceiptText size={18} />}
                  onClick={() => setReceipt(booking.receipt ?? null)}
                >
                  Чек
                </Button>
              ) : null}
            </TripCard>
          ))}
        </div>
        {history.length === 0 ? <div className="stateBlock compact">Завершенных поездок пока нет</div> : null}
      </section>

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
      <CancelBookingModal
        booking={cancelTarget}
        now={now}
        isPending={cancelBooking.isPending}
        error={cancelBooking.error?.message}
        onClose={() => setCancelTarget(null)}
        onConfirm={(booking) => cancelBooking.mutate(booking.id)}
      />
    </section>
  );
}

function CancelBookingModal({
  booking,
  now,
  isPending,
  error,
  onClose,
  onConfirm,
}: {
  booking: Booking | null;
  now: Date;
  isPending: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (booking: Booking) => void;
}) {
  if (!booking) {
    return null;
  }

  const preview = cancellationPreview(booking, now);

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <article className="modal cancelModal">
        <header className="modalHeader">
          <div>
            <p className="eyebrow">Отмена брони</p>
            <h2>{preview.title}</h2>
          </div>
          <Button variant="ghost" icon={<X size={18} />} aria-label="Закрыть" onClick={onClose} />
        </header>
        <p className="modalText">{preview.description}</p>
        <div className="receiptLines">
          {preview.lines.map((line) => (
            <div key={line.label}>
              <span>{line.label}</span>
              <strong>{line.amount.toLocaleString('ru-RU')} ₽</strong>
            </div>
          ))}
        </div>
        <footer className="receiptTotal">
          <span>К удержанию</span>
          <strong>{preview.totalAmount.toLocaleString('ru-RU')} ₽</strong>
        </footer>
        {error ? <div className="formError">{error}</div> : null}
        <div className="modalActions">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Назад
          </Button>
          <Button variant="danger" icon={<Ban size={18} />} onClick={() => onConfirm(booking)} disabled={isPending}>
            Подтвердить отмену
          </Button>
        </div>
      </article>
    </div>
  );
}

function TripCard({ booking, children, now }: { booking: Booking; children?: React.ReactNode; now: Date }) {
  const start = booking.actualStartAt ?? booking.startAt;
  const end = booking.cancelledAt ?? booking.actualEndAt ?? booking.plannedEndAt;
  const reserved = booking.status === 'RESERVED' ? reservationState(booking, now) : null;

  return (
    <article className="tripCard">
      <div className="tripMain">
        <div>
          <h3>
            {booking.car.model.brand} {booking.car.model.name}
          </h3>
          <p>{booking.car.model.trim}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>
      <dl className="tripDetails">
        <div>
          <dt>Начало</dt>
          <dd>{new Date(start).toLocaleString('ru-RU')}</dd>
        </div>
        <div>
          <dt>Окончание</dt>
          <dd>{new Date(end).toLocaleString('ru-RU')}</dd>
        </div>
        <div>
          <dt>{booking.waitAmount > 0 ? 'Сумма с ожиданием' : 'Сумма'}</dt>
          <dd>{booking.totalAmount.toLocaleString('ru-RU')} ₽</dd>
        </div>
      </dl>
      {reserved ? (
        <div className={`tripNotice ${reserved.tone}`}>
          <strong>{reserved.title}</strong>
          <span>{reserved.description}</span>
        </div>
      ) : null}
      {booking.status === 'ACTIVE' && booking.waitAmount > 0 ? (
        <p className="smallNote">Платное ожидание до старта: {booking.waitAmount.toLocaleString('ru-RU')} ₽</p>
      ) : null}
      {booking.status === 'CANCELLED' && booking.totalAmount > 0 ? (
        <p className="smallNote">Удержание при отмене: {booking.totalAmount.toLocaleString('ru-RU')} ₽</p>
      ) : null}
      <div className="tripOptions">{booking.options.map((item) => item.option.name).join(', ')}</div>
      {children ? <footer className="tripActions">{children}</footer> : null}
    </article>
  );
}

const FREE_CANCELLATION_AFTER_BOOKING_MINUTES = 5;
const FREE_CANCELLATION_BEFORE_START_MINUTES = 30;
const LATE_CANCELLATION_FEE = 100;
const FREE_WAIT_MINUTES = 15;
const WAIT_PRICE_PER_MINUTE = 5;

function reservationState(booking: Booking, now: Date) {
  const startAt = new Date(booking.startAt);
  const freeWaitUntil = new Date(booking.freeWaitUntil);
  const expiresAt = new Date(booking.expiresAt);
  const startWindowAt = addMinutes(startAt, -10);

  if (now < startWindowAt) {
    return {
      canStart: false,
      tone: 'neutral',
      title: 'Старт еще закрыт',
      description: `Поездка станет доступна через ${formatDuration(startWindowAt.getTime() - now.getTime())}.`,
    };
  }

  if (now < startAt) {
    return {
      canStart: true,
      tone: 'success',
      title: 'Можно начинать заранее',
      description: `До планового старта ${formatDuration(startAt.getTime() - now.getTime())}.`,
    };
  }

  if (now < freeWaitUntil) {
    return {
      canStart: true,
      tone: 'success',
      title: 'Идет бесплатное ожидание',
      description: `Платное удержание начнется через ${formatDuration(freeWaitUntil.getTime() - now.getTime())}.`,
    };
  }

  if (now < expiresAt) {
    return {
      canStart: true,
      tone: 'warning',
      title: 'Идет платное ожидание',
      description: `Бронь истечет через ${formatDuration(expiresAt.getTime() - now.getTime())}.`,
    };
  }

  return {
    canStart: false,
    tone: 'danger',
    title: 'Бронь истекла',
    description: 'Автомобиль скоро вернется в каталог.',
  };
}

function cancellationPreview(booking: Booking, now: Date) {
  const createdAt = new Date(booking.createdAt);
  const startAt = new Date(booking.startAt);
  const freeWaitUntil = new Date(booking.freeWaitUntil);
  const freeGraceUntil = addMinutes(createdAt, FREE_CANCELLATION_AFTER_BOOKING_MINUTES);
  const freeBeforeStartUntil = addMinutes(startAt, -FREE_CANCELLATION_BEFORE_START_MINUTES);

  if (now <= freeGraceUntil) {
    return {
      title: 'Отменить бесплатно',
      description: `Первые ${FREE_CANCELLATION_AFTER_BOOKING_MINUTES} минут после создания брони отменяются без удержания.`,
      lines: [{ label: 'Отмена брони', amount: 0 }],
      totalAmount: 0,
    };
  }

  if (now < freeBeforeStartUntil) {
    return {
      title: 'Отменить бесплатно',
      description: `До планового старта больше ${FREE_CANCELLATION_BEFORE_START_MINUTES} минут, автомобиль можно освободить без удержания.`,
      lines: [{ label: 'Отмена брони', amount: 0 }],
      totalAmount: 0,
    };
  }

  if (now < startAt) {
    return {
      title: 'Поздняя отмена',
      description: 'До старта осталось меньше 30 минут, поэтому удерживается фиксированный сбор за занятый автомобиль.',
      lines: [{ label: 'Поздняя отмена брони', amount: LATE_CANCELLATION_FEE }],
      totalAmount: LATE_CANCELLATION_FEE,
    };
  }

  if (now < freeWaitUntil) {
    return {
      title: 'Отменить бесплатно',
      description: 'Плановый старт уже наступил, но еще идет бесплатное ожидание.',
      lines: [{ label: 'Отмена в бесплатное ожидание', amount: 0 }],
      totalAmount: 0,
    };
  }

  const waitAmount = paidWaitAmount(startAt, booking.expiresAt, now);
  return {
    title: 'Отмена с платным ожиданием',
    description: 'Бесплатное ожидание закончилось, удерживается только время платного ожидания автомобиля.',
    lines: [{ label: 'Платное ожидание до отмены', amount: waitAmount }],
    totalAmount: waitAmount,
  };
}

function paidWaitAmount(startAt: Date, expiresAtValue: string, now: Date) {
  const freeWaitUntil = addMinutes(startAt, FREE_WAIT_MINUTES);
  const expiresAt = new Date(expiresAtValue);
  const chargeUntil = new Date(Math.min(now.getTime(), expiresAt.getTime()));
  const paidMinutes = Math.max(0, Math.ceil((chargeUntil.getTime() - freeWaitUntil.getTime()) / 60_000));
  return paidMinutes * WAIT_PRICE_PER_MINUTE;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  }

  return `${minutes} мин`;
}
