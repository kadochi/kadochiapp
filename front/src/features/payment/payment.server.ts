import "server-only";

import { z } from "zod";

import { internalRequestHeaders } from "@/features/auth/services/internal-auth";
import { discardUpstreamResponse, parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { paymentStateSchema, type PaymentState } from "./payment-state";
import { paymentProviderIdSchema } from "./providers";
import type { ParsedPaymentCallback } from "./callbacks.server";

const paymentStateResponseSchema = z.object({
  orderId: z.number().int().positive(),
  provider: paymentProviderIdSchema,
  state: paymentStateSchema,
}).strict();

const callbackTimeoutMs = 25_000;

export async function paymentStateForOrder(provider: string, orderId: number, requestId: string) {
  const payload = `${provider}\n${orderId}`;
  const response = await wordpressFetch(`/wp-json/kadochi/v1/internal/payments/orders/${orderId}/state?provider=${encodeURIComponent(provider)}`, {
    headers: internalRequestHeaders("payment-state", payload, requestId),
    cache: "no-store",
    requestId,
  });
  const result = await parseUpstreamJson(response, (value) => paymentStateResponseSchema.parse(value), requestId);
  if (result.provider !== provider) throw new Error("Payment provider mismatch.");
  return result;
}

/**
 * Hands the public browser return to the fixed Woo gateway callback. The relay
 * has no browser cookies or authorization: Woo verifies the provider callback,
 * then the separate HMAC endpoint reports only its normalized result.
 */
export async function reconcilePaymentCallback(callback: ParsedPaymentCallback, requestId: string): Promise<PaymentState> {
  let relayCompleted = false;
  try {
    const query = new URLSearchParams({ "wc-api": callback.provider.wooCallbackKey });
    for (const [key, value] of callback.relayQuery) query.append(key, value);
    const response = await wordpressFetch(`/?${query.toString()}`, {
      redirect: "manual",
      acceptStatuses: [301, 302, 303, 307, 308],
      cache: "no-store",
      requestId,
      timeoutMs: callbackTimeoutMs,
    });
    await discardUpstreamResponse(response, requestId);
    relayCompleted = true;
  } catch {
    // The callback may have reached Woo before its response was lost. The
    // authoritative state lookup below decides whether it is safe to finalize.
  }

  try {
    const result = await paymentStateForOrder(callback.provider.id, callback.orderId, requestId);
    if (result.state === "paid" || result.state === "failed" || result.state === "cancelled") return result.state;
    return relayCompleted ? result.state : "unknown";
  } catch {
    return "unknown";
  }
}
