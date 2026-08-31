/**
 * Delivery windows are evaluated in Tehran time because checkout only accepts
 * Tehran delivery addresses. Keeping this rule shared makes catalog promises
 * match the slots a customer can actually select at checkout.
 */
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
  };
}

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** Creates the exact checkout slot availability for one preparation time. */
export function createDeliverySlotsForPreparationHours(preparationHours: number, now = new Date()): DeliverySlot[] {
  const tehran = tehranParts(now);
  const hours = Number.isFinite(preparationHours) && preparationHours >= 1 ? preparationHours : 24;
  // Use Tehran wall-clock timestamps, matching the WordPress DateTime logic.
  const readyAt = Date.UTC(tehran.year, tehran.month - 1, tehran.day, tehran.hour, tehran.minute) + hours * 60 * 60 * 1000;
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

/** True only when checkout currently offers at least one slot later today. */
export function canReceiveToday(preparationHours: number, now = new Date()): boolean {
  const slots = createDeliverySlotsForPreparationHours(preparationHours, now);
  const today = slots[0]?.date;
  return Boolean(today && slots.some((slot) => slot.date === today && slot.available));
}
