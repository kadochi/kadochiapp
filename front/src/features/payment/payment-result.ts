import type { PaymentState } from "./payment-state";
import { paymentResultPath } from "./payment-state";

type PaymentResultOrder = {
  id: number;
  payment: { state: PaymentState };
};

export type ResolvedPaymentResult =
  | { kind: "success"; state: "paid"; href: string }
  | { kind: "failure"; state: "failed" | "cancelled"; href: string }
  | { kind: "neutral"; state: "pending" | "unknown"; href: string };

/** Maps authoritative owner-summary state to the only permitted result screen. */
export function resolvePaymentResult(order: PaymentResultOrder): ResolvedPaymentResult {
  const { state } = order.payment;
  if (state === "paid") return { kind: "success", state, href: paymentResultPath(state, order.id) };
  if (state === "failed" || state === "cancelled") return { kind: "failure", state, href: paymentResultPath(state, order.id) };
  return { kind: "neutral", state, href: paymentResultPath(state, order.id) };
}
