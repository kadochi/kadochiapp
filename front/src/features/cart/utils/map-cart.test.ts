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
    totals: { line_subtotal: "116000000", line_total: "104000000", currency_code: "IRR", currency_minor_unit: 0 },
    images: [{ src: "https://example.test/gift.jpg" }],
    extensions: { kadochi: { preparationHours: 4 } },
  }],
  totals: {
    total_items: "116000000",
    total_items_tax: "0",
    total_fees: "0",
    total_fees_tax: "0",
    total_discount: "12000000",
    total_discount_tax: "0",
    total_shipping: null,
    total_shipping_tax: null,
    total_tax: "0",
    total_price: "104000000",
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
  it("maps Woo quantity limits, product subtotal, discounts, and pre-calculation null totals", () => {
    const cart = mapCart(upstreamCartSchema.parse(rawCart));

    expect(cart.items[0]).toMatchObject({
      productId: 13,
      quantity: 2,
      quantityLimits: { minimum: 1, maximum: 8, multipleOf: 1, editable: true },
      preparationHours: 4,
      fastDeliveryEligible: true,
      isCrossSell: false,
    });
    expect(cart.totals.totalItems.amount).toBe("116000000");
    expect(cart.totals.totalDiscount.amount).toBe("12000000");
    expect(cart.totals.totalPrice.amount).toBe("104000000");
    expect(cart.items[0].lineSubtotal.amount).toBe("116000000");
    expect(cart.items[0].lineTotal.amount).toBe("104000000");
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
