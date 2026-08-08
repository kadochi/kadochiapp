import { bffJson } from "@/lib/http/browser";
import { cartSchema, addItemSchema, couponCodeSchema, selectShippingRateSchema, updateCustomerSchema, updateQuantitySchema } from "../schema/cart";
import type { AddItemInput, CouponCodeInput, CustomerAddresses, ShippingRateInput } from "../types";
import { productSchema } from "@/features/products/schema/products";
import type { Product } from "@/features/products/types";

export const cartChangedEvent = "kadochi:cart-changed";

function announceCartChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(cartChangedEvent));
}

export const getCart = () => bffJson("/api/cart", { method: "GET" }, (value) => cartSchema.parse(value));
export async function addItem(input: AddItemInput) {
  const cart = await bffJson("/api/cart/items", { method: "POST", body: JSON.stringify(addItemSchema.parse(input)) }, (value) => cartSchema.parse(value));
  announceCartChange();
  return cart;
}
export async function addCrossSellItem(productId: number) {
  const cart = await bffJson("/api/cart/cross-sells/items", { method: "POST", body: JSON.stringify({ productId }) }, (value) => cartSchema.parse(value));
  announceCartChange();
  return cart;
}
export const getCartCrossSells = () => bffJson("/api/cart/cross-sells", { method: "GET" }, (value): Product[] => productSchema.array().parse(value));
export async function updateQuantity(itemKey: string, quantity: number) {
  const cart = await bffJson(`/api/cart/items/${encodeURIComponent(itemKey)}`, { method: "PATCH", body: JSON.stringify(updateQuantitySchema.parse({ quantity })) }, (value) => cartSchema.parse(value));
  announceCartChange();
  return cart;
}
export async function removeItem(itemKey: string) {
  const cart = await bffJson(`/api/cart/items/${encodeURIComponent(itemKey)}`, { method: "DELETE" }, (value) => cartSchema.parse(value));
  announceCartChange();
  return cart;
}
export const updateCustomer = (addresses: CustomerAddresses) => bffJson("/api/cart/customer", { method: "PATCH", body: JSON.stringify(updateCustomerSchema.parse(addresses)) }, (value) => cartSchema.parse(value));
export const selectShippingRate = (input: ShippingRateInput) => bffJson("/api/cart/shipping-rate", { method: "POST", body: JSON.stringify(selectShippingRateSchema.parse(input)) }, (value) => cartSchema.parse(value));
export async function applyCoupon(input: CouponCodeInput) {
  const cart = await bffJson("/api/cart/coupons", { method: "POST", body: JSON.stringify(couponCodeSchema.parse(input)) }, (value) => cartSchema.parse(value));
  announceCartChange();
  return cart;
}
export async function removeCoupon(code: string) {
  const cart = await bffJson(`/api/cart/coupons/${encodeURIComponent(code)}`, { method: "DELETE" }, (value) => cartSchema.parse(value));
  announceCartChange();
  return cart;
}
