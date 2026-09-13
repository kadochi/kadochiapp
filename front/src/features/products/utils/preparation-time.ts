import { canReceiveToday } from "@/lib/delivery/same-day";

/** Human-friendly Persian lead-time label used by the PDP and catalog. */
export function formatPreparationTime(hours: number): string {
  if (!Number.isFinite(hours) || hours < 1) return "۱ روز";
  if (hours >= 24) return `${Math.ceil(hours / 24).toLocaleString("fa-IR")} روز`;
  return `${hours.toLocaleString("fa-IR")} ساعت`;
}

export type DeliveryBadge = {
  label: string;
  usesFastDeliveryIcon: boolean;
};

export type ProductDeliveryTime = "today" | "tomorrow";

/** The shared preparation bucket used by both product labels and catalog filters. */
function preparationDeliveryTime(hours: number, now = new Date()): ProductDeliveryTime | "later" {
  if (canReceiveToday(hours, now)) return "today";
  if (hours <= 24) return "tomorrow";
  return "later";
}

/** Maps the preparation-time bands to the delivery promise shown to customers. */
export function deliveryBadge(hours: number, now = new Date()): DeliveryBadge {
  // A preparation time alone is not a delivery promise. A fast label is shown
  // only when checkout still has a same-day slot after the product is ready.
  const deliveryTime = preparationDeliveryTime(hours, now);
  if (deliveryTime === "today") {
    return hours <= 3
      ? { label: "ارسال فوری تهران", usesFastDeliveryIcon: true }
      : { label: "ارسال سریع امروز", usesFastDeliveryIcon: true };
  }
  if (deliveryTime === "tomorrow") return { label: "تحویل از فردا", usesFastDeliveryIcon: false };
  return { label: `ارسال ${Math.ceil(hours / 24).toLocaleString("fa-IR")} روز کاری`, usesFastDeliveryIcon: false };
}

/** Catalog inclusion rule backed by the same preparation bucket as product labels. */
export function isDeliveryTimeProduct(hours: number, deliveryTime: ProductDeliveryTime, now = new Date()): boolean {
  return preparationDeliveryTime(hours, now) === deliveryTime;
}

/** Catalog and homepage inclusion rule for the "ارسال امروز" collection. */
export function isSameDayDeliveryProduct(hours: number, now = new Date()): boolean {
  return isDeliveryTimeProduct(hours, "today", now);
}
