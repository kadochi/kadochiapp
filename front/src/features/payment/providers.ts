import { z } from "zod";

import type { PaymentState } from "./payment-state";

export const paymentProviderIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,49}$/);

export type PaymentProvider = {
  id: string;
  wooGatewayId: string;
  wooCallbackKey: string;
  title: string;
  redirectHosts: readonly string[];
  callback: {
    allowedQueryKeys: readonly string[];
    orderIdKey: string;
    statusKey: string;
    authorityKey?: string;
  };
  lifecycle: {
    initialState: "pending";
    classifyCallback: (status: string) => Extract<PaymentState, "cancelled" | "pending">;
  };
  translateCheckoutFailure: (value: unknown) => PaymentFailure | null;
};

const providers: readonly PaymentProvider[] = [
  {
    id: "zarinpal",
    wooGatewayId: "WC_ZPal",
    wooCallbackKey: "WC_ZPal",
    title: "پرداخت آنلاین زرین‌پال",
    // The official plugin has used both hosts across releases; accepting only
    // these exact HTTPS hosts keeps handoff validation provider-owned.
    redirectHosts: ["payment.zarinpal.com", "sandbox.zarinpal.com", "www.zarinpal.com"],
    callback: {
      allowedQueryKeys: ["wc_order", "Status", "Authority"],
      orderIdKey: "wc_order",
      statusKey: "Status",
      authorityKey: "Authority",
    },
    lifecycle: {
      initialState: "pending",
      classifyCallback: (status) => status === "OK" ? "pending" : "cancelled",
    },
    translateCheckoutFailure: zarinpalCheckoutFailure,
  },
] as const;

export type PaymentProviderId = string;

export function paymentProviderById(id: string): PaymentProvider | undefined {
  return providers.find((provider) => provider.id === id);
}

export function paymentProviderByGatewayId(gatewayId: string): PaymentProvider | undefined {
  return providers.find((provider) => provider.wooGatewayId === gatewayId);
}

export function isTrustedPaymentRedirect(provider: PaymentProvider, value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && provider.redirectHosts.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export type PaymentFailureCategory = "configuration" | "temporarily_unavailable" | "rejected" | "cancelled" | "unknown";

export type PaymentFailure = {
  provider: PaymentProviderId;
  code?: number;
  category: PaymentFailureCategory;
  retryable: boolean;
};

const zarinpalCategories: Record<number, PaymentFailureCategory> = {
  "-9": "rejected",
  "-10": "configuration",
  "-11": "configuration",
  "-12": "temporarily_unavailable",
  "-15": "configuration",
  "-16": "configuration",
  "-17": "configuration",
  "-18": "configuration",
  "-19": "rejected",
  "-51": "cancelled",
};

/** Maps only a documented ZarinPal checkout notice into the safe shared shape. */
export function zarinpalCheckoutFailure(value: unknown): PaymentFailure | null {
  const response = z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    data: z.object({ status: z.number().int().optional(), code: z.union([z.number().int(), z.string()]).optional() }).passthrough().optional(),
    errors: z.array(z.object({ code: z.union([z.number().int(), z.string()]).optional(), message: z.string().optional() }).passthrough()).optional(),
  }).passthrough().safeParse(value);
  if (!response.success) return null;

  const message = response.data.message ?? response.data.errors?.[0]?.message ?? "";
  const code = response.data.errors?.[0]?.code ?? response.data.data?.code
    ?? /(?:zarin\s*pal|زرین\s*پال).{0,80}?(?:code|کد)?\s*[:：#-]?\s*(-?\d+)/iu.exec(message)?.[1]
    ?? /(?:code|کد)\s*[:：#-]?\s*(-?\d+)/iu.exec(message)?.[1];
  const gatewayCode = code !== undefined && /^-?\d+$/.test(String(code)) ? Number(code) : undefined;
  if (!/zarin\s*pal|زرین\s*پال/iu.test(message) && gatewayCode === undefined) return null;

  const category = gatewayCode === undefined ? "unknown" : zarinpalCategories[gatewayCode] ?? "unknown";
  return {
    provider: "zarinpal",
    ...(gatewayCode === undefined ? {} : { code: gatewayCode }),
    category,
    retryable: category === "temporarily_unavailable" || category === "unknown",
  };
}
