import { describe, expect, it } from "vitest";

import { upstreamCartSchema } from "../schema/cart";
import { formatIrrAsToman, irrToToman } from "./money";
import { mapCart } from "./map-cart";

const rawCart = {
  items: [{
    key: "line-1",
    id: 13,
    quantity: 2,
    quantity_limits: { minimum: 1, maximum: 8, multiple_of: 1, editable: true },
    name: "Gift",
    prices: { price: "58000000", currency_code: "IRR", currency_minor_unit: 0 },
    totals: { line_total: "116000000", currency_code: "IRR", currency_minor_unit: 0 },
    images: [{ src: "https://example.test/gift.jpg" }],
    extensions: { kadochi: { fastDelivery: true } },
  }],
  totals: {
    total_items: "116000000",
    total_items_tax: "0",
    total_fees: "0",
    total_fees_tax: "0",
    total_discount: "0",
    total_discount_tax: "0",
    total_shipping: null,
    total_shipping_tax: null,
    total_tax: "0",
    total_price: "116000000",
    currency_code: "IRR",
    currency_minor_unit: 0,
  },
  needs_shipping: true,
  has_calculated_shipping: false,
  payment_methods: ["zarinpal"],
  coupons: [{ code: "WELCOME10" }],
  shipping_rates: [],
};

describe("mapCart", () => {
  it("maps Woo quantity limits, extension data, and pre-calculation null totals", () => {
    const cart = mapCart(upstreamCartSchema.parse(rawCart));

    expect(cart.items[0]).toMatchObject({
      productId: 13,
      quantity: 2,
      quantityLimits: { minimum: 1, maximum: 8, multipleOf: 1, editable: true },
      fastDeliveryEligible: true,
    });
    expect(cart.totals.totalShipping.amount).toBe("0");
    expect(cart.paymentMethodIds).toEqual(["zarinpal"]);
    expect(cart.coupons).toEqual([{ code: "WELCOME10" }]);
  });

  it("formats authoritative IRR amounts as Toman", () => {
    const money = { amount: "58000000", currencyCode: "IRR", minorUnit: 0 };
    expect(irrToToman(money)).toBe(5_800_000);
    expect(formatIrrAsToman(money)).toContain("۵٬۸۰۰٬۰۰۰");
  });
});
