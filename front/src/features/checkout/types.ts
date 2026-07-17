import type { z } from "zod";
import type { checkoutResultSchema, checkoutStateSchema, orderSummarySchema, submitCheckoutSchema } from "./schema/checkout";
export type CheckoutState = z.infer<typeof checkoutStateSchema>;
export type CheckoutResult = z.infer<typeof checkoutResultSchema>;
export type SubmitCheckoutInput = z.input<typeof submitCheckoutSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
