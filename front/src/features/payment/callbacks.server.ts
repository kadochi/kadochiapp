import "server-only";

import { z } from "zod";

import type { PaymentProvider } from "./providers";

const orderIdSchema = z.string().regex(/^[1-9][0-9]{0,14}$/).transform((value) => Number(value)).refine(Number.isSafeInteger);
const statusSchema = z.string().trim().min(1).max(32);
const authoritySchema = z.string().trim().regex(/^[A-Za-z0-9_-]{16,128}$/);

export type ParsedPaymentCallback = {
  orderId: number;
  provider: PaymentProvider;
  hintState: "cancelled" | "pending";
  relayQuery: URLSearchParams;
};

/**
 * This route is intentionally provider-specific at the parsing boundary. A
 * new provider supplies its callback keys and lifecycle classifier in the
 * registry rather than turning the BFF into an open redirect/proxy.
 */
export function parsePaymentCallback(provider: PaymentProvider, params: URLSearchParams): ParsedPaymentCallback {
  const allowed = new Set(provider.callback.allowedQueryKeys);
  for (const key of params.keys()) {
    if (!allowed.has(key)) throw new Error("Unexpected callback parameter.");
  }
  const one = (key: string) => {
    const values = params.getAll(key);
    if (values.length !== 1) throw new Error("Invalid callback parameter.");
    return values[0];
  };

  const orderId = orderIdSchema.parse(one(provider.callback.orderIdKey));
  const status = statusSchema.parse(one(provider.callback.statusKey));
  const hintState = provider.lifecycle.classifyCallback(status);
  const relayQuery = new URLSearchParams({ [provider.callback.orderIdKey]: String(orderId), [provider.callback.statusKey]: status });

  const authorityKey = provider.callback.authorityKey;
  const authority = authorityKey ? params.getAll(authorityKey) : [];
  const authorityValue = authority[0] ?? "";
  if (authority.length > 1) throw new Error("Invalid callback parameter.");
  if (hintState === "pending") {
    if (!authorityKey) throw new Error("Missing payment callback authority configuration.");
    relayQuery.set(authorityKey, authoritySchema.parse(authorityValue));
  } else if (authorityKey) {
    // ZarinPal does not require an authority on cancellation. Preserve a
    // well-formed one for provider variants, but drop a malformed one so the
    // cancellation still reaches Woo instead of leaving the order pending.
    const parsedAuthority = authoritySchema.safeParse(authorityValue);
    if (parsedAuthority.success) relayQuery.set(authorityKey, parsedAuthority.data);
  }

  return { orderId, provider, hintState, relayQuery };
}
