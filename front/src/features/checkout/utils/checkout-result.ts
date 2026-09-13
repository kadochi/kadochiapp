import type { CheckoutResult } from "../types";
import { paymentResultPath } from "@/features/payment/payment-state";

export type CheckoutResultAction =
  | { kind: "navigate"; href: string }
  | { kind: "external"; href: string }
  | { kind: "unknown" }
  | { kind: "invalid" };

/** Converts the provider-neutral checkout result into the single next UI action. */
export function checkoutResultAction(result: CheckoutResult): CheckoutResultAction {
  const payment = result.payment;
  if (payment?.state === "unknown") return { kind: "unknown" };
  if (payment?.state === "pending" && payment.redirectUrl) return { kind: "external", href: payment.redirectUrl };
  if (payment && result.orderId) return { kind: "navigate", href: paymentResultPath(payment.state, result.orderId) };
  if (result.orderId) return { kind: "navigate", href: `/checkout/return?order=${result.orderId}&state=unknown` };
  return { kind: "invalid" };
}
