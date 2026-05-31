import { PricingType, RateType } from '@prisma/client';
import { calculateQuote, unitBoundsFor } from '../src/pricing/pricing.service';

const tariff = {
  hourlyPrice: 800,
  dailyPrice: 6500,
  longTermDailyPrice: 5600,
  longTermFromDays: 7,
};

describe('pricing', () => {
  it('calculates hourly rentals', () => {
    expect(calculateQuote({ rateType: RateType.HOURLY, units: 3, tariff, options: [] }).totalAmount).toBe(2400);
  });

  it('calculates daily rentals', () => {
    expect(calculateQuote({ rateType: RateType.DAILY, units: 2, tariff, options: [] }).totalAmount).toBe(13000);
  });

  it('enforces long-term minimum', () => {
    expect(calculateQuote({ rateType: RateType.LONG_TERM, units: 3, tariff, options: [] }).baseAmount).toBe(39200);
  });

  it('exposes booking unit limits', () => {
    expect(unitBoundsFor(RateType.HOURLY, tariff)).toEqual({ min: 1, max: 23 });
    expect(unitBoundsFor(RateType.DAILY, tariff)).toEqual({ min: 1, max: 6 });
    expect(unitBoundsFor(RateType.LONG_TERM, tariff)).toEqual({ min: 7, max: 30 });
  });

  it('calculates fixed and periodic options', () => {
    const result = calculateQuote({
      rateType: RateType.HOURLY,
      units: 2,
      tariff,
      options: [
        { id: 'delivery', name: 'Delivery', price: 700, pricingType: PricingType.FIXED },
        { id: 'charger', name: 'Mobile charger', price: 120, pricingType: PricingType.PER_HOUR },
      ],
    });

    expect(result.optionsAmount).toBe(940);
    expect(result.totalAmount).toBe(2540);
  });
});
