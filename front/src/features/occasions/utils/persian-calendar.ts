export type PersianDateParts = {
  year: number;
  month: number;
  day: number;
};

export const PERSIAN_MONTHS = [
  "",
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

const persianDateFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  day: "numeric",
  month: "numeric",
  timeZone: "UTC",
  year: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "UTC",
  weekday: "long",
});

/** Returns Persian-calendar values while keeping API dates in ISO/Gregorian form. */
export function getPersianDateParts(date: Date): PersianDateParts {
  const values = Object.fromEntries(
    persianDateFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<"year" | "month" | "day", number>;

  return { day: values.day, month: values.month, year: values.year };
}

/** Every Gregorian day that belongs to one Persian calendar month. */
export function getPersianMonthDates(year: number, month: number): Date[] {
  // Persian month 1 begins near 21 March, so this Gregorian anchor is always
  // within a few weeks of the target month. The scan also covers leap years.
  const anchor = Date.UTC(year + 621, month + 1, 1);
  const result: Date[] = [];

  for (let offset = -35; offset <= 65; offset += 1) {
    const date = new Date(anchor + offset * 86_400_000);
    const parts = getPersianDateParts(date);
    if (parts.year === year && parts.month === month) result.push(date);
  }

  return result.sort((first, second) => first.getTime() - second.getTime());
}

export function getPersianWeekday(date: Date): string {
  return weekdayFormatter.format(date);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function movePersianMonth(
  year: number,
  month: number,
  direction: -1 | 1,
): { year: number; month: number } {
  if (direction === 1 && month === 12) return { year: year + 1, month: 1 };
  if (direction === -1 && month === 1) return { year: year - 1, month: 12 };
  return { year, month: month + direction };
}
