import "server-only";

import { cookies } from "next/headers";
import { parseUpstreamJson, UpstreamError, wordpressFetch } from "@/lib/http/upstream";
import { upstreamCartSchema } from "../schema/cart";
import { mapCart } from "../utils/map-cart";

const cartTokenCookie = "kadochi_cart_token";
type CartAction = { method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; body?: unknown };

export async function executeCart(action: CartAction, requestId: string) {
  const token = (await cookies()).get(cartTokenCookie)?.value;
  const response = await wordpressFetch(action.path, { method: action.method, body: action.body ? JSON.stringify(action.body) : undefined, headers: { ...(token ? { "Cart-Token": token } : {}), ...(action.body ? { "Content-Type": "application/json" } : {}) }, cache: "no-store", requestId });
  const cart = mapCart(await parseUpstreamJson(response, (value) => upstreamCartSchema.parse(value), requestId));
  return { cart, cartToken: response.headers.get("cart-token") };
}

/** A failed remove response can arrive after Woo has already changed the cart. */
export async function removeCartCoupon(code: string, requestId: string) {
  const remove = () => executeCart({ method: "POST", path: "/wp-json/wc/store/v1/cart/remove-coupon", body: { code } }, requestId);
  const read = () => executeCart({ method: "GET", path: "/wp-json/wc/store/v1/cart" }, requestId);
  const stillApplied = (cart: Awaited<ReturnType<typeof executeCart>>["cart"]) =>
    cart.coupons.some((coupon) => coupon.code.toLowerCase() === code.toLowerCase());
  const recoverable = (error: unknown) => error instanceof UpstreamError && error.detail.retryable && error.detail.status >= 500;

  try {
    return await remove();
  } catch (error) {
    if (!recoverable(error)) throw error;
    const current = await read();
    if (!stillApplied(current.cart)) return current;
    try {
      return await remove();
    } catch (retryError) {
      if (!recoverable(retryError)) throw retryError;
      const latest = await read();
      if (!stillApplied(latest.cart)) return latest;
      throw retryError;
    }
  }
}

/** Empties the tokenized Woo cart, which also removes any applied coupon codes. */
export async function clearCart(requestId: string) {
  const token = (await cookies()).get(cartTokenCookie)?.value;
  const response = await wordpressFetch("/wp-json/wc/store/v1/cart/items", {
    method: "DELETE",
    headers: token ? { "Cart-Token": token } : {},
    cache: "no-store",
    requestId,
  });
  await parseUpstreamJson(response, () => undefined, requestId);
  return { cartToken: response.headers.get("cart-token") };
}

export function applyCartToken(response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }, token: string | null) {
  if (!token) return;
  response.cookies.set(cartTokenCookie, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
