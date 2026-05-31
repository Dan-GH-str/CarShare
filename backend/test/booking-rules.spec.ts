import { bookingTiming, cancellationChargeFor, canStartBooking, waitAmountFor } from '../src/bookings/booking-rules';

describe('booking rules', () => {
  const startAt = new Date('2026-05-30T10:00:00.000Z');

  it('calculates start and waiting windows', () => {
    const timing = bookingTiming(startAt);

    expect(timing.startWindowAt.toISOString()).toBe('2026-05-30T09:50:00.000Z');
    expect(timing.freeWaitUntil.toISOString()).toBe('2026-05-30T10:15:00.000Z');
    expect(timing.expiresAt.toISOString()).toBe('2026-05-30T10:30:00.000Z');
  });

  it('blocks too early starts', () => {
    const timing = bookingTiming(startAt);

    expect(canStartBooking(startAt, timing.expiresAt, new Date('2026-05-30T09:49:59.000Z'))).toBe(false);
    expect(canStartBooking(startAt, timing.expiresAt, new Date('2026-05-30T09:50:00.000Z'))).toBe(true);
  });

  it('calculates paid waiting after the free window', () => {
    expect(waitAmountFor(startAt, new Date('2026-05-30T10:14:00.000Z'))).toBe(0);
    expect(waitAmountFor(startAt, new Date('2026-05-30T10:16:00.000Z'))).toBe(5);
    expect(waitAmountFor(startAt, new Date('2026-05-30T10:30:00.000Z'))).toBe(75);
    expect(waitAmountFor(startAt, new Date('2026-05-30T10:45:00.000Z'))).toBe(75);
  });

  it('calculates cancellation charges', () => {
    const createdAt = new Date('2026-05-30T09:00:00.000Z');

    expect(cancellationChargeFor(startAt, createdAt, new Date('2026-05-30T09:04:00.000Z'))).toMatchObject({
      reason: 'FREE_GRACE',
      totalAmount: 0,
    });
    expect(cancellationChargeFor(startAt, createdAt, new Date('2026-05-30T09:20:00.000Z'))).toMatchObject({
      reason: 'FREE_EARLY',
      totalAmount: 0,
    });
    expect(cancellationChargeFor(startAt, createdAt, new Date('2026-05-30T09:45:00.000Z'))).toMatchObject({
      reason: 'LATE_BEFORE_START',
      cancellationAmount: 100,
      totalAmount: 100,
    });
    expect(cancellationChargeFor(startAt, createdAt, new Date('2026-05-30T10:10:00.000Z'))).toMatchObject({
      reason: 'FREE_WAIT',
      totalAmount: 0,
    });
    expect(cancellationChargeFor(startAt, createdAt, new Date('2026-05-30T10:20:00.000Z'))).toMatchObject({
      reason: 'PAID_WAIT',
      waitAmount: 25,
      totalAmount: 25,
    });
  });
});
