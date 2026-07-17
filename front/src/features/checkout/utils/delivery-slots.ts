import type { Cart } from "../../cart/types";

export type DeliverySlot = {
  id: string;
  date: string;
  startHour: 10 | 13 | 16;
  endHour: 13 | 16 | 19;
  label: string;
};

const tehranTimeZone = "Asia/Tehran";
const windows = [
  { startHour: 10 as const, endHour: 13 as const },
  { startHour: 13 as const, endHour: 16 as const },
  { startHour: 16 as const, endHour: 19 as const },
];

function tehranParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tehranTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(now).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    weekday: parts.weekday,
  };
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** Mirrors the WordPress slot rules: Tehran windows, no Fridays, and same-day only for fast carts. */
export function createDeliverySlots(cart: Pick<Cart, "items">, now = new Date()): DeliverySlot[] {
  const tehran = tehranParts(now);
  const fastCart = cart.items.length > 0 && cart.items.every((item) => item.fastDeliveryEligible);
  const date = new Date(Date.UTC(tehran.year, tehran.month - 1, tehran.day));
  if (!fastCart) date.setUTCDate(date.getUTCDate() + 1);

  const slots: DeliverySlot[] = [];
  while (slots.length < 9) {
    // Friday is 5 in JS's UTC day numbering (Sunday 0).
    if (date.getUTCDay() !== 5) {
      const isToday = formatDate(date) === `${tehran.year}-${String(tehran.month).padStart(2, "0")}-${String(tehran.day).padStart(2, "0")}`;
      for (const window of windows) {
        if (slots.length === 9) break;
        // A delivery window can only be offered while its start remains ahead.
        if (isToday && window.startHour <= tehran.hour) continue;
        const dateString = formatDate(date);
        slots.push({
          id: `${dateString}-${window.startHour}`,
          date: dateString,
          startHour: window.startHour,
          endHour: window.endHour,
          label: `${dateString}، ${window.startHour} تا ${window.endHour}`,
        });
      }
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return slots;
}
