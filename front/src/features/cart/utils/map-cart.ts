import type { z } from "zod";
import { cartSchema, type upstreamCartSchema } from "../schema/cart";
type UpstreamCart = z.infer<typeof upstreamCartSchema>;

const money = (amount: string, currencyCode: string, minorUnit: number) => ({ amount, currencyCode, minorUnit });
export function mapCart(cart: UpstreamCart) {
  return cartSchema.parse({
    items: cart.items.map((item) => ({ key: item.key, productId: item.id, name: item.name, quantity: item.quantity, price: money(item.prices.price, item.prices.currency_code, item.prices.currency_minor_unit), imageUrl: item.image?.src })),
    totals: { totalItems: money(cart.totals.total_items, cart.totals.currency_code, cart.totals.currency_minor_unit), totalShipping: money(cart.totals.total_shipping, cart.totals.currency_code, cart.totals.currency_minor_unit), totalTax: money(cart.totals.total_tax, cart.totals.currency_code, cart.totals.currency_minor_unit), totalPrice: money(cart.totals.total_price, cart.totals.currency_code, cart.totals.currency_minor_unit) },
    shippingRates: cart.shipping_rates.map((group) => ({ packageId: group.package_id, selectedRate: group.rates.find((rate) => rate.selected)?.rate_id ?? null, rates: group.rates.map((rate) => ({ rateId: rate.rate_id, name: rate.name, price: money(rate.price, cart.totals.currency_code, cart.totals.currency_minor_unit), selected: rate.selected })) })),
  });
}
