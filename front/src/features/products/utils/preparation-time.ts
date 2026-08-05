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

/** Maps the preparation-time bands to the delivery promise shown to customers. */
export function deliveryBadge(hours: number): DeliveryBadge {
  if (hours <= 3) return { label: "ارسال فوری تهران", usesFastDeliveryIcon: true };
  if (hours <= 6) return { label: "ارسال سریع امروز", usesFastDeliveryIcon: true };
  if (hours <= 24) return { label: "تحویل از فردا", usesFastDeliveryIcon: false };
  return { label: `ارسال ${Math.ceil(hours / 24).toLocaleString("fa-IR")} روز کاری`, usesFastDeliveryIcon: false };
}
