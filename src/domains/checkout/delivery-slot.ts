import {
  dayjs,
  WEEKDAYS_FA,
  PERSIAN_MONTHS,
  persianDigits,
} from "@/lib/jalali";
import type { Dayjs } from "dayjs";

export type DeliveryPartKey = "صبح" | "ظهر" | "عصر";

export type DeliveryPartDescriptor = {
  key: DeliveryPartKey;
  fromHour: number;
  toHour: number;
  fromLabel: string;
  toLabel: string;
};

export const DELIVERY_PARTS: readonly DeliveryPartDescriptor[] = [
  { key: "صبح", fromHour: 10, toHour: 13, fromLabel: "۱۰", toLabel: "۱۳" },
  { key: "ظهر", fromHour: 13, toHour: 16, fromLabel: "۱۳", toLabel: "۱۶" },
  { key: "عصر", fromHour: 16, toHour: 19, fromLabel: "۱۶", toLabel: "۱۹" },
] as const;

export type DeliverySlot = {
  id: string;
  dayLabel: string;
  dateLabel: string;
  part: DeliveryPartKey;
  from: string;
  to: string;
  disabled?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format a dayjs date as a Persian weekday name. */
function faDayLabel(d: Dayjs): string {
  return WEEKDAYS_FA[d.day()] ?? "";
}

/** Format a dayjs date as "DD MonthName" in Persian. */
function faDateLabel(d: Dayjs): string {
  const jd = d.calendar("jalali");
  const day = persianDigits(String(jd.date()).padStart(2, "0"));
  const month = PERSIAN_MONTHS[jd.month() + 1] ?? "";
  return `${day} ${month}`;
}

/** Build a slot ID string from a dayjs date and part key. */
function slotIdFromDayjs(d: Dayjs, partKey: DeliveryPartKey): string {
  return `${d.format("YYYY-MM-DD")}_${partKey}`;
}

export function findDeliveryPart(
  partKey: string,
): DeliveryPartDescriptor | undefined {
  return DELIVERY_PARTS.find((item) => item.key === partKey.trim());
}

export function formatDeliveryWindow(slotId: string): string | null {
  if (!slotId) return null;
  const [datePart, partKey] = slotId.split("_");
  if (!datePart || !partKey) return null;
  const part = findDeliveryPart(partKey);
  if (!part) return null;

  const d = dayjs(datePart, "YYYY-MM-DD");
  if (!d.isValid()) return null;

  const dayLabel = faDayLabel(d);
  const dateLabel = faDateLabel(d);

  return `${dayLabel} ${dateLabel}، ${part.key} (${part.fromLabel} الی ${part.toLabel})`;
}

export function slotIdFromDate(date: Date, partKey: DeliveryPartKey): string {
  return slotIdFromDayjs(dayjs(date), partKey);
}

/* ------------------------------------------------------------------ */
/*  Slot builder (replaces inline logic in CheckoutClient)             */
/* ------------------------------------------------------------------ */

const TOTAL_SLOTS = 9;
const MAX_DAY_SCAN = 14; // safety cap to prevent infinite loop

/**
 * Build delivery slots, matching the existing business rules:
 * - 9 slots total (3 time parts × days)
 * - Fridays are skipped
 * - If `allFast` is true, start from today; otherwise start from tomorrow
 * - Same-day slots whose `fromHour` has already passed are marked `disabled`
 */
export function buildDeliverySlots(allFast: boolean): DeliverySlot[] {
  const now = dayjs();
  const startFromToday = allFast === true;
  let dayCursor = startFromToday
    ? now.startOf("day")
    : now.add(1, "day").startOf("day");

  const out: DeliverySlot[] = [];

  for (
    let dayIdx = 0;
    out.length < TOTAL_SLOTS && dayIdx < MAX_DAY_SCAN;
    dayIdx++
  ) {
    // Skip Fridays (day() === 5)
    if (dayCursor.day() === 5) {
      dayCursor = dayCursor.add(1, "day");
      continue;
    }

    for (const p of DELIVERY_PARTS) {
      if (out.length >= TOTAL_SLOTS) break;

      let disabled = false;
      if (dayCursor.isSame(now, "day")) {
        disabled = now.hour() >= p.fromHour;
      }

      out.push({
        id: slotIdFromDayjs(dayCursor, p.key),
        dayLabel: faDayLabel(dayCursor),
        dateLabel: faDateLabel(dayCursor),
        part: p.key,
        from: p.fromLabel,
        to: p.toLabel,
        disabled,
      });
    }

    dayCursor = dayCursor.add(1, "day");
  }

  return out;
}
