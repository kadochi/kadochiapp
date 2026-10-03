import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./order-celebration", () => ({ OrderCelebration: () => null }));

import { orderSummarySchema } from "../schema/checkout";
import { OrderResult } from "./order-result";

const summary = {
  id: 1917, paid: true, status: "processing", createdAt: "2026-10-03T12:00:00Z",
  total: { amount: "980000", currencyCode: "IRR", minorUnit: 0 },
  sender: "Sender", recipient: { firstName: "Recipient", lastName: "" },
  deliverySlot: null, address: "Tehran",
};

describe("SnappPay receipt reference", () => {
  it.each([true, false])("shows the stored reference on the result page when paid=%s", (paid) => {
    const order = orderSummarySchema.parse({ ...summary, paid, snappPayTransactionId: "KS1H901" });
    const html = renderToStaticMarkup(<OrderResult order={order} paid={paid} />);
    expect(html).toContain("شناسه تراکنش اسنپ‌پی");
    expect(html).toContain("KS1H901");
  });

  it.each([true, false])("keeps existing results without a Snapp reference unchanged when paid=%s", (paid) => {
    const order = orderSummarySchema.parse({ ...summary, paid });
    expect(renderToStaticMarkup(<OrderResult order={order} paid={paid} />)).not.toContain("شناسه تراکنش اسنپ‌پی");
  });

  it("accepts absent references and rejects a URL or token-shaped value", () => {
    expect(orderSummarySchema.parse({ ...summary, snappPayTransactionId: null }).snappPayTransactionId).toBeNull();
    expect(() => orderSummarySchema.parse({ ...summary, snappPayTransactionId: "https://snapp.example/token" })).toThrow();
  });
});
