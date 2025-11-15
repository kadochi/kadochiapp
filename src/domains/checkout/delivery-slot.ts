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

const dayFormatter = new Intl.DateTimeFormat("fa-IR", { weekday: "long" });
const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  day: "2-digit",
  month: "long",
});

function normaliseDateForSlot(datePart: string): Date | null {
  const [y, m, d] = datePart.split("-").map((chunk) => Number(chunk));
  if (!y || !m || !d) return null;
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function findDeliveryPart(
  partKey: string
): DeliveryPartDescriptor | undefined {
  return DELIVERY_PARTS.find((item) => item.key === partKey.trim());
}

export function formatDeliveryWindow(slotId: string): string | null {
  if (!slotId) return null;
  const [datePart, partKey] = slotId.split("_");
  if (!datePart || !partKey) return null;
  const part = findDeliveryPart(partKey);
  if (!part) return null;

  const date = normaliseDateForSlot(datePart);
  if (!date) return null;

  const dayLabel = dayFormatter.format(date);
  const dateLabel = dateFormatter.format(date);

  return `${dayLabel} ${dateLabel}، ${part.key} (${part.fromLabel} الی ${part.toLabel})`;
}

export function slotIdFromDate(date: Date, partKey: DeliveryPartKey): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}_${partKey}`;
}
