import type { z } from "zod";
import type { checkoutResultSchema, checkoutStateSchema, submitCheckoutSchema } from "./schema/checkout";
export type CheckoutState = z.infer<typeof checkoutStateSchema>;
export type CheckoutResult = z.infer<typeof checkoutResultSchema>;
export type SubmitCheckoutInput = z.input<typeof submitCheckoutSchema>;
