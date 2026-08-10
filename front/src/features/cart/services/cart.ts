import { bffJson } from "@/lib/http/browser";
import { cartSchema, addItemSchema, couponCodeSchema, selectShippingRateSchema, updateCustomerSchema, updateQuantitySchema } from "../schema/cart";
import type { AddItemInput, Cart, CouponCodeInput, CustomerAddresses, ShippingRateInput } from "../types";
import { productSchema } from "@/features/products/schema/products";
import type { Product } from "@/features/products/types";

export const cartChangedEvent = "kadochi:cart-changed";
const cartSnapshotMs = 1_000;
let cartRevision = 0;
let cartRequest: { identity: object; promise: Promise<Cart>; revision: number } | undefined;
let cartSnapshot: { cart: Cart; expiresAt: number } | undefined;

function rememberCart(cart: Cart): Cart {
  cartSnapshot = { cart, expiresAt: Date.now() + cartSnapshotMs };
  return cart;
}

function announceCartChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(cartChangedEvent));
}

function beginCartMutation(): number {
  cartRevision += 1;
  cartRequest = undefined;
  cartSnapshot = undefined;
  return cartRevision;
}

function rememberMutationCart(cart: Cart, revision: number): Cart {
  if (revision === cartRevision) {
    // Invalidate reads that began while this mutation was in flight before
    // publishing its authoritative response as the newest snapshot.
    cartRevision += 1;
    rememberCart(cart);
  }
  return cart;
}

async function executeCartMutation(path: string, init: RequestInit, announce: boolean): Promise<Cart> {
  const revision = beginCartMutation();
  const cart = rememberMutationCart(
    await bffJson(path, init, (value) => cartSchema.parse(value)),
    revision,
  );
  if (announce) announceCartChange();
  return cart;
}

export function getCart(): Promise<Cart> {
  if (cartSnapshot && cartSnapshot.expiresAt > Date.now()) return Promise.resolve(cartSnapshot.cart);
  if (cartRequest?.revision === cartRevision) return cartRequest.promise;
  const revision = cartRevision;
  const identity = {};
  const promise = bffJson("/api/cart", { method: "GET" }, (value) => cartSchema.parse(value))
    .then((cart) => revision === cartRevision ? rememberCart(cart) : cart)
    .finally(() => {
      if (cartRequest?.identity === identity) cartRequest = undefined;
    });
  cartRequest = { identity, promise, revision };
  return promise;
}

export const addItem = (input: AddItemInput) => executeCartMutation(
  "/api/cart/items",
  { method: "POST", body: JSON.stringify(addItemSchema.parse(input)) },
  true,
);
export const addCrossSellItem = (productId: number) => executeCartMutation(
  "/api/cart/cross-sells/items",
  { method: "POST", body: JSON.stringify({ productId }) },
  true,
);
export const getCartCrossSells = () => bffJson("/api/cart/cross-sells", { method: "GET" }, (value): Product[] => productSchema.array().parse(value));
export const updateQuantity = (itemKey: string, quantity: number) => executeCartMutation(
  `/api/cart/items/${encodeURIComponent(itemKey)}`,
  { method: "PATCH", body: JSON.stringify(updateQuantitySchema.parse({ quantity })) },
  true,
);
export const removeItem = (itemKey: string) => executeCartMutation(
  `/api/cart/items/${encodeURIComponent(itemKey)}`,
  { method: "DELETE" },
  true,
);
export const updateCustomer = (addresses: CustomerAddresses) => executeCartMutation(
  "/api/cart/customer",
  { method: "PATCH", body: JSON.stringify(updateCustomerSchema.parse(addresses)) },
  false,
);
export const selectShippingRate = (input: ShippingRateInput) => executeCartMutation(
  "/api/cart/shipping-rate",
  { method: "POST", body: JSON.stringify(selectShippingRateSchema.parse(input)) },
  false,
);
export const applyCoupon = (input: CouponCodeInput) => executeCartMutation(
  "/api/cart/coupons",
  { method: "POST", body: JSON.stringify(couponCodeSchema.parse(input)) },
  true,
);
export const removeCoupon = (code: string) => executeCartMutation(
  `/api/cart/coupons/${encodeURIComponent(code)}`,
  { method: "DELETE" },
  true,
);
