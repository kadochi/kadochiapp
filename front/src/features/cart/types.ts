import type { z } from "zod";
import type { addItemSchema, cartSchema, couponCodeSchema, selectDeliverySlotSchema, selectShippingRateSchema, updateCustomerSchema } from "./schema/cart";
export type Cart = z.infer<typeof cartSchema>;
export type AddItemInput = z.input<typeof addItemSchema>;
export type CustomerAddresses = z.input<typeof updateCustomerSchema>;
export type ShippingRateInput = z.input<typeof selectShippingRateSchema>;
export type DeliverySlotInput = z.input<typeof selectDeliverySlotSchema>;
export type CouponCodeInput = z.input<typeof couponCodeSchema>;
