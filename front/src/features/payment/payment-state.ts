import { z } from "zod";

/** The only state vocabulary used to make customer-facing payment decisions. */
export const paymentStateSchema = z.enum(["paid", "failed", "cancelled", "pending", "unknown"]);

export type PaymentState = z.infer<typeof paymentStateSchema>;

export function isRetryablePaymentState(state: PaymentState): boolean {
  return state === "failed" || state === "cancelled";
}

export function paymentResultPath(state: PaymentState, orderId: number): string {
  const order = encodeURIComponent(String(orderId));
  if (state === "paid") return `/checkout/success?order=${order}`;
  if (state === "failed" || state === "cancelled") return `/checkout/failure?order=${order}&state=${state}`;
  return `/checkout/return?order=${order}&state=${state}`;
}
