import type { z } from "zod";

import { cartSchema, type upstreamCartSchema } from "../schema/cart";

type UpstreamCart = z.infer<typeof upstreamCartSchema>;

const money = (amount: string, currencyCode: string, minorUnit: number) => ({ amount, currencyCode, minorUnit });

function fastDeliveryEligible(extensions: Record<string, unknown>): boolean {
  const extension = extensions.kadochi;
  if (!extension || typeof extension !== "object") return false;
  const candidate = extension as { fastDelivery?: unknown; fast_delivery?: unknown };
  return candidate.fastDelivery === true || candidate.fast_delivery === true;
}

export function mapCart(cart: UpstreamCart) {
  const totals = cart.totals;
  const totalMoney = (amount: string) => money(amount, totals.currency_code, totals.currency_minor_unit);

  return cartSchema.parse({
    items: cart.items.map((item) => ({
      key: item.key,
      productId: item.id,
      name: item.name,
      quantity: item.quantity,
      quantityLimits: {
        minimum: item.quantity_limits.minimum,
        maximum: item.quantity_limits.maximum,
        multipleOf: item.quantity_limits.multiple_of,
        editable: item.quantity_limits.editable,
      },
      price: money(item.prices.price, item.prices.currency_code, item.prices.currency_minor_unit),
      lineTotal: money(item.totals.line_total, item.totals.currency_code, item.totals.currency_minor_unit),
      imageUrl: item.images[0]?.src,
      fastDeliveryEligible: fastDeliveryEligible(item.extensions),
    })),
    totals: {
      totalItems: totalMoney(totals.total_items),
      totalItemsTax: totalMoney(totals.total_items_tax),
      totalFees: totalMoney(totals.total_fees),
      totalFeesTax: totalMoney(totals.total_fees_tax),
      totalDiscount: totalMoney(totals.total_discount),
      totalDiscountTax: totalMoney(totals.total_discount_tax),
      totalShipping: totalMoney(totals.total_shipping ?? "0"),
      totalShippingTax: totalMoney(totals.total_shipping_tax ?? "0"),
      totalTax: totalMoney(totals.total_tax),
      totalPrice: totalMoney(totals.total_price),
    },
    shipping: {
      needsShipping: cart.needs_shipping,
      hasCalculatedShipping: cart.has_calculated_shipping,
    },
    paymentMethodIds: cart.payment_methods,
    shippingRates: cart.shipping_rates.map((group) => ({
      packageId: group.package_id,
      selectedRate: group.shipping_rates.find((rate) => rate.selected)?.rate_id ?? null,
      rates: group.shipping_rates.map((rate) => ({
        rateId: rate.rate_id,
        name: rate.name,
        price: totalMoney(rate.price),
        selected: rate.selected,
      })),
    })),
  });
}
