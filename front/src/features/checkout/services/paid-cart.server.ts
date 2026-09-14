import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

type CookieResponse = Pick<NextResponse, "cookies">;

const paymentOrderCookie = "kadochi_payment_order";
// Long enough for a slow bank page and verification, short enough that a stale
// marker cannot clear an unrelated cart much later.
const paymentOrderMaxAgeSeconds = 60 * 60;

function cookieOptions(maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge };
}

/**
 * Marks the order this browser handed to the gateway. The success page clears
 * the cart only for this order, once, so revisiting an old result is harmless.
 */
export function storePaymentOrder(response: CookieResponse, orderId: number): void {
  response.cookies.set(paymentOrderCookie, String(orderId), cookieOptions(paymentOrderMaxAgeSeconds));
}

export function clearPaymentOrder(response: CookieResponse): void {
  response.cookies.set(paymentOrderCookie, "", cookieOptions(0));
}

export async function isPendingPaymentOrder(orderId: number): Promise<boolean> {
  return (await cookies()).get(paymentOrderCookie)?.value === String(orderId);
}
