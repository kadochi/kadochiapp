import { describe, expect, it } from "vitest";

import { checkoutResultAction } from "./checkout-result";

describe("checkoutResultAction", () => {
  it("routes reconciled paid and unpaid orders to their result pages", () => {
    expect(checkoutResultAction({ orderId: 41, status: "processing", reconciliation: "paid" }))
      .toEqual({ kind: "navigate", href: "/checkout/success?order=41" });
    expect(checkoutResultAction({ orderId: 42, status: "failed", reconciliation: "unpaid" }))
      .toEqual({ kind: "navigate", href: "/checkout/failure?order=42" });
  });

  it("blocks another payment when reconciliation is unknown", () => {
    expect(checkoutResultAction({ status: "unknown", reconciliation: "unknown" }))
      .toEqual({ kind: "unknown" });
  });

  it("prefers a gateway redirect and otherwise verifies an order locally", () => {
    expect(checkoutResultAction({
      orderId: 43,
      status: "pending",
      paymentResult: { paymentStatus: "pending", redirectUrl: "https://pay.example/session" },
    })).toEqual({ kind: "external", href: "https://pay.example/session" });
    expect(checkoutResultAction({ orderId: 44, status: "pending" }))
      .toEqual({ kind: "navigate", href: "/checkout/return?order=44" });
  });

  it("rejects a response that has no safe next action", () => {
    expect(checkoutResultAction({ status: "pending" })).toEqual({ kind: "invalid" });
  });
});
