import type { Cart } from "../../cart/types";

export type DeliverySlot = {
  id: string;
  date: string;
  startHour: 10 | 13 | 16;
  endHour: 13 | 16 | 19;
  label: string;
  available: boolean;
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
    minute: "2-digit",
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
    minute: Number(parts.minute),
    weekday: parts.weekday,
  };
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** Mirrors WordPress: always show the next three calendar days and disable unavailable windows. */
export function createDeliverySlots(cart: Pick<Cart, "items">, now = new Date()): DeliverySlot[] {
  const tehran = tehranParts(now);
  const preparationHours = cart.items.length ? Math.max(...cart.items.map((item) => item.preparationHours ?? 24)) : 24;
  // Work with Tehran wall-clock timestamps so this matches PHP DateTime.
  const readyAt = Date.UTC(tehran.year, tehran.month - 1, tehran.day, tehran.hour, tehran.minute) + preparationHours * 60 * 60 * 1000;
  const date = new Date(Date.UTC(tehran.year, tehran.month - 1, tehran.day));

  const slots: DeliverySlot[] = [];
  for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
    const isToday = dayOffset === 0;
    const isFriday = date.getUTCDay() === 5;
    const dateString = formatDate(date);
    for (const window of windows) {
      const slotStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), window.startHour);
      const available = !isFriday && (!isToday || window.startHour > tehran.hour) && slotStart >= readyAt;
      slots.push({
        id: `${dateString}-${window.startHour}`,
        date: dateString,
        startHour: window.startHour,
        endHour: window.endHour,
        label: `${dateString}، ${window.startHour} تا ${window.endHour}`,
        available,
      });
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return slots;
}
