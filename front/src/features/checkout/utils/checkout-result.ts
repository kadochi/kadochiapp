import type { CheckoutResult } from "../types";

export type CheckoutResultAction =
  | { kind: "navigate"; href: string }
  | { kind: "external"; href: string }
  | { kind: "unknown" }
  | { kind: "invalid" };

/** Converts Woo/reconciliation output into the single next action the UI may take. */
export function checkoutResultAction(result: CheckoutResult): CheckoutResultAction {
  if (result.reconciliation === "paid" && result.orderId) {
    return { kind: "navigate", href: `/checkout/success?order=${result.orderId}` };
  }
  if (result.reconciliation === "unpaid" && result.orderId) {
    return { kind: "navigate", href: `/checkout/failure?order=${result.orderId}` };
  }
  if (result.reconciliation === "unknown") return { kind: "unknown" };
  if (result.paymentResult?.redirectUrl) return { kind: "external", href: result.paymentResult.redirectUrl };
  if (result.orderId) return { kind: "navigate", href: `/checkout/return?order=${result.orderId}` };
  return { kind: "invalid" };
}
