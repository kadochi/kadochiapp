import type { Cart } from "../../cart/types";
import { createDeliverySlotsForPreparationHours, type DeliverySlot } from "@/lib/delivery/same-day";

export type { DeliverySlot } from "@/lib/delivery/same-day";

/** Mirrors WordPress: always show the next three calendar days and disable unavailable windows. */
export function createDeliverySlots(cart: Pick<Cart, "items">, now = new Date()): DeliverySlot[] {
  const preparationHours = cart.items.length ? Math.max(...cart.items.map((item) => item.preparationHours ?? 24)) : 24;
  return createDeliverySlotsForPreparationHours(preparationHours, now);
}
