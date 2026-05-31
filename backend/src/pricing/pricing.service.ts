import { PricingType, RateType } from '@prisma/client';

export type QuoteOption = {
  id: string;
  name: string;
  price: number;
  pricingType: PricingType;
};

export type QuoteTariff = {
  hourlyPrice: number;
  dailyPrice: number;
  longTermDailyPrice: number;
  longTermFromDays: number;
};

export type QuoteInput = {
  rateType: RateType;
  units: number;
  tariff: QuoteTariff;
  options: QuoteOption[];
};

export type QuoteResult = {
  rateType: RateType;
  units: number;
  billableHours: number;
  billableDays: number;
  baseAmount: number;
  optionsAmount: number;
  totalAmount: number;
  optionLines: Array<{ optionId: string; label: string; amount: number; pricingType: PricingType }>;
};

export const RATE_UNIT_LIMITS = {
  [RateType.HOURLY]: { min: 1, max: 23 },
  [RateType.DAILY]: { min: 1, max: 6 },
  [RateType.LONG_TERM]: { min: 7, max: 30 },
} as const;

export function unitBoundsFor(rateType: RateType, tariff: QuoteTariff) {
  const fallback = RATE_UNIT_LIMITS[rateType];
  return {
    ...fallback,
    min: rateType === RateType.LONG_TERM ? Math.max(fallback.min, tariff.longTermFromDays) : fallback.min,
  };
}

export function normalizeUnits(rateType: RateType, units: number, tariff: QuoteTariff) {
  const rounded = Math.max(1, Math.ceil(Number.isFinite(units) ? units : 1));
  if (rateType === RateType.LONG_TERM) {
    return Math.max(unitBoundsFor(rateType, tariff).min, rounded);
  }
  return rounded;
}

export function calculateQuote(input: QuoteInput): QuoteResult {
  const units = normalizeUnits(input.rateType, input.units, input.tariff);
  const billableHours = input.rateType === RateType.HOURLY ? units : units * 24;
  const billableDays = input.rateType === RateType.HOURLY ? Math.ceil(units / 24) : units;

  const baseAmount =
    input.rateType === RateType.HOURLY
      ? units * input.tariff.hourlyPrice
      : input.rateType === RateType.DAILY
        ? units * input.tariff.dailyPrice
        : units * input.tariff.longTermDailyPrice;

  const optionLines = input.options.map((option) => {
    const amount =
      option.pricingType === PricingType.FIXED
        ? option.price
        : option.pricingType === PricingType.PER_HOUR
          ? option.price * billableHours
          : option.price * billableDays;

    return {
      optionId: option.id,
      label: option.name,
      amount,
      pricingType: option.pricingType,
    };
  });

  const optionsAmount = optionLines.reduce((sum, line) => sum + line.amount, 0);

  return {
    rateType: input.rateType,
    units,
    billableHours,
    billableDays,
    baseAmount,
    optionsAmount,
    totalAmount: baseAmount + optionsAmount,
    optionLines,
  };
}

export function unitsFromDuration(rateType: RateType, startAt: Date, endAt: Date, tariff: QuoteTariff) {
  const durationMs = Math.max(1, endAt.getTime() - startAt.getTime());
  if (rateType === RateType.HOURLY) {
    return normalizeUnits(rateType, durationMs / 3_600_000, tariff);
  }
  return normalizeUnits(rateType, durationMs / 86_400_000, tariff);
}
