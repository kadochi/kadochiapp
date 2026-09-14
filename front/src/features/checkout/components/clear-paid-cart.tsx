"use client";

import { useEffect } from "react";

import { clearPaidOrderCart } from "@/features/cart/services/cart";

/** Fires the one-time paid-cart clear; the order is already verified, so failures are only logged. */
export function ClearPaidCart({ orderId }: { orderId: number }) {
  useEffect(() => {
    clearPaidOrderCart(orderId).catch((error: unknown) => {
      console.error("[checkout] clear_paid_cart_failed", { orderId, error });
    });
  }, [orderId]);
  return null;
}
