import { bffJson } from "@/lib/http/browser";
import { checkoutResultSchema, checkoutStateSchema, submitCheckoutSchema } from "../schema/checkout";
import type { SubmitCheckoutInput } from "../types";
export const getCheckoutState = () => bffJson("/api/checkout", { method: "GET" }, (value) => checkoutStateSchema.parse(value));
export const submitCheckout = (input: SubmitCheckoutInput) => bffJson("/api/checkout", { method: "POST", body: JSON.stringify(submitCheckoutSchema.parse(input)) }, (value) => checkoutResultSchema.parse(value));
