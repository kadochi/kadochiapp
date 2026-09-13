import { describe, expect, it } from "vitest";

import { checkoutResultAction } from "./checkout-result";

describe("checkoutResultAction", () => {
  it("routes terminal normalized states to their result pages", () => {
    expect(checkoutResultAction({ orderId: 41, status: "processing", payment: { provider: "zarinpal", state: "paid" } }))
      .toEqual({ kind: "navigate", href: "/checkout/success?order=41" });
    expect(checkoutResultAction({ orderId: 42, status: "failed", payment: { provider: "zarinpal", state: "cancelled" } }))
      .toEqual({ kind: "navigate", href: "/checkout/failure?order=42&state=cancelled" });
  });

  it("blocks another payment when state is unknown", () => {
    expect(checkoutResultAction({ status: "unknown", payment: { provider: "zarinpal", state: "unknown" } }))
      .toEqual({ kind: "unknown" });
  });

  it("uses a trusted-provider handoff only while the state is pending", () => {
    expect(checkoutResultAction({
      orderId: 43,
      status: "pending",
      payment: { provider: "zarinpal", state: "pending", redirectUrl: "https://pay.example/session" },
    })).toEqual({ kind: "external", href: "https://pay.example/session" });
    expect(checkoutResultAction({ orderId: 44, status: "pending" }))
      .toEqual({ kind: "navigate", href: "/checkout/return?order=44&state=unknown" });
  });

  it("rejects a response that has no safe next action", () => {
    expect(checkoutResultAction({ status: "pending" })).toEqual({ kind: "invalid" });
  });
});
