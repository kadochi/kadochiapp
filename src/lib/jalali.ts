import dayjs from "dayjs";
import jalaliday from "jalali-plugin-dayjs";

dayjs.extend(jalaliday);

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

export const WEEKDAYS_FA = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
] as const;

export const persianDigits = (numStr: string) =>
  numStr.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

export type JalaliParts = { jy: number; jm: number; jd: number };

/** Returns today's date in Jalali calendar. */
export function todayJalali(): JalaliParts {
  const d = dayjs().calendar("jalali");
  return {
    jy: d.year(),
    jm: d.month() + 1,
    jd: d.date(),
  };
}

/**
 * Converts Jalali (jy, jm, jd) to Gregorian YYYY-MM-DD string.
 * jm is 1-indexed (1 = Farvardin, 12 = Esfand).
 */
export function toGregorianKey(jy: number, jm: number, jd: number): string {
  const d = dayjs()
    .calendar("jalali")
    .year(jy)
    .month(jm - 1)
    .date(jd);
  const native = d.toDate();
  const gy = native.getFullYear();
  const gm = native.getMonth() + 1;
  const gd = native.getDate();
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

/**
 * Normalizes ACF occasion_date to YYYY-MM-DD.
 * ACF REST API returns Ymd (e.g. 20250404) or Y-m-d (e.g. 2025-04-04).
 */
export function parseOccasionDate(raw: string | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo}-${d}`;
  }

  return null;
}

/**
 * Parses a Gregorian YYYY-MM-DD string and returns Jalali parts.
 */
export function gregorianToJalali(iso: string): JalaliParts | null {
  const normalized = parseOccasionDate(iso);
  if (!normalized) return null;
  const d = dayjs(normalized).calendar("jalali");
  if (!d.isValid()) return null;
  return {
    jy: d.year(),
    jm: d.month() + 1,
    jd: d.date(),
  };
}

/** Maps JS getDay() (0=Sun) to Persian weekday name. */
export function jsDayToFa(jsDay: number): string {
  return WEEKDAYS_FA[jsDay] ?? "";
}

export { dayjs };
