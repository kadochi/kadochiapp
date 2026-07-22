import type { z } from "zod";
import type { createSavedAddressSchema, checkoutResultSchema, checkoutStateSchema, orderSummarySchema, savedAddressSchema, submitCheckoutSchema } from "./schema/checkout";
export type CheckoutState = z.infer<typeof checkoutStateSchema>;
export type CheckoutResult = z.infer<typeof checkoutResultSchema>;
export type SubmitCheckoutInput = z.input<typeof submitCheckoutSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export type SavedAddress = z.infer<typeof savedAddressSchema>;
export type CreateSavedAddressInput = z.input<typeof createSavedAddressSchema>;
