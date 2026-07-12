import type { z } from "zod";
import type { addItemSchema, cartSchema, selectShippingRateSchema, updateCustomerSchema } from "./schema/cart";
export type Cart = z.infer<typeof cartSchema>;
export type AddItemInput = z.input<typeof addItemSchema>;
export type CustomerAddresses = z.input<typeof updateCustomerSchema>;
export type ShippingRateInput = z.input<typeof selectShippingRateSchema>;
