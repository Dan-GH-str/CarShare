export const START_LEAD_MINUTES = 10;
export const FREE_WAIT_MINUTES = 15;
export const BOOKING_EXPIRE_MINUTES = 30;
export const WAIT_PRICE_PER_MINUTE = 5;
export const FREE_CANCELLATION_AFTER_BOOKING_MINUTES = 5;
export const FREE_CANCELLATION_BEFORE_START_MINUTES = 30;
export const LATE_CANCELLATION_FEE = 100;

const minuteMs = 60_000;

export type CancellationReason =
  | 'FREE_GRACE'
  | 'FREE_EARLY'
  | 'LATE_BEFORE_START'
  | 'FREE_WAIT'
  | 'PAID_WAIT';

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * minuteMs);
}

export function bookingTiming(startAt: Date) {
  return {
    startWindowAt: addMinutes(startAt, -START_LEAD_MINUTES),
    freeWaitUntil: addMinutes(startAt, FREE_WAIT_MINUTES),
    expiresAt: addMinutes(startAt, BOOKING_EXPIRE_MINUTES),
  };
}

export function waitAmountFor(startAt: Date, checkedAt: Date) {
  const { freeWaitUntil, expiresAt } = bookingTiming(startAt);
  const chargeUntil = new Date(Math.min(checkedAt.getTime(), expiresAt.getTime()));
  const paidWaitMs = chargeUntil.getTime() - freeWaitUntil.getTime();

  if (paidWaitMs <= 0) {
    return 0;
  }

  return Math.ceil(paidWaitMs / minuteMs) * WAIT_PRICE_PER_MINUTE;
}

export function canStartBooking(startAt: Date, expiresAt: Date, now: Date) {
  return now >= addMinutes(startAt, -START_LEAD_MINUTES) && now < expiresAt;
}

export function cancellationChargeFor(startAt: Date, createdAt: Date, checkedAt: Date) {
  if (checkedAt <= addMinutes(createdAt, FREE_CANCELLATION_AFTER_BOOKING_MINUTES)) {
    return cancellationCharge(0, 0, 'FREE_GRACE');
  }

  if (checkedAt < addMinutes(startAt, -FREE_CANCELLATION_BEFORE_START_MINUTES)) {
    return cancellationCharge(0, 0, 'FREE_EARLY');
  }

  if (checkedAt < startAt) {
    return cancellationCharge(LATE_CANCELLATION_FEE, 0, 'LATE_BEFORE_START');
  }

  const waitAmount = waitAmountFor(startAt, checkedAt);
  return cancellationCharge(0, waitAmount, waitAmount > 0 ? 'PAID_WAIT' : 'FREE_WAIT');
}

function cancellationCharge(cancellationAmount: number, waitAmount: number, reason: CancellationReason) {
  return {
    reason,
    cancellationAmount,
    waitAmount,
    totalAmount: cancellationAmount + waitAmount,
  };
}
