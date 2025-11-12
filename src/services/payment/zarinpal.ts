import "server-only";

import {
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors";
import { retry } from "@/services/http/retry";

interface BaseZarinpalResponse<T> {
  data?: T | null;
  errors?: Array<{ code?: number; message?: string | null }> | null;
}

interface RequestPayload {
  merchant_id: string;
  amount: number;
  callback_url: string;
  description: string;
  metadata?: {
    order_id?: string;
    email?: string;
    mobile?: string;
  };
  currency?: "IRT" | "IRR";
}

interface RequestResponseData {
  code?: number;
  authority?: string;
  fee_type?: string;
  fee?: number;
}

interface VerifyPayload {
  merchant_id: string;
  authority: string;
  amount: number;
  currency?: "IRT" | "IRR";
}

interface VerifyResponseData {
  code?: number;
  ref_id?: number | string;
  card_pan?: string;
  fee_type?: string;
  fee?: number;
}

export interface RequestPaymentResult {
  authority: string;
  url: string;
  code: number;
}

export interface VerifyPaymentResult {
  code: number;
  paid: boolean;
  ref_id?: number | string;
  card_pan?: string;
  raw: VerifyResponseData;
}

interface CallOptions {
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal | null | undefined;
}

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRIES = 3;

function resolveBaseUrls() {
  const sandbox = (process.env.ZARINPAL_MODE || "").toLowerCase() !== "production";
  return {
    request: sandbox
      ? "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
      : "https://api.zarinpal.com/pg/v4/payment/request.json",
    verify: sandbox
      ? "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
      : "https://api.zarinpal.com/pg/v4/payment/verify.json",
    startPay: sandbox
      ? "https://sandbox.zarinpal.com/pg/StartPay/"
      : "https://www.zarinpal.com/pg/StartPay/",
  } as const;
}

function createTimeoutController(
  timeoutMs: number,
  upstream?: AbortSignal | null | undefined
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);

  if (upstream) {
    if (upstream.aborted) {
      controller.abort(upstream.reason);
    } else {
      const onAbort = () => controller.abort(upstream.reason);
      upstream.addEventListener("abort", onAbort, { once: true });
      return {
        signal: controller.signal,
        cleanup: () => {
          clearTimeout(timeout);
          upstream.removeEventListener("abort", onAbort);
        },
      } as const;
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
    },
  } as const;
}

async function callZarinpal<T>(
  endpoint: string,
  payload: object,
  { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, signal }: CallOptions = {}
): Promise<BaseZarinpalResponse<T>> {
  return retry(
    async (attempt) => {
      const { signal: timeoutSignal, cleanup } = createTimeoutController(
        timeoutMs,
        signal
      );
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
          signal: timeoutSignal,
        });

        const text = await response.text().catch(() => "");
        let json: BaseZarinpalResponse<T> | null = null;
        if (text) {
          try {
            json = JSON.parse(text) as BaseZarinpalResponse<T>;
          } catch {
            json = null;
          }
        }

        if (!response.ok) {
          if (response.status >= 500) {
            throw new UpstreamBadResponse(response.status, "zarinpal_5xx");
          }
          throw new UpstreamBadResponse(response.status, "zarinpal_bad_status");
        }

        if (!json) {
          throw new UpstreamBadResponse(502, "zarinpal_invalid_json");
        }

        return json;
      } catch (err) {
        if (err instanceof UpstreamTimeout) throw err;
        if (err instanceof UpstreamBadResponse) throw err;
        if (err instanceof Error && err.name === "AbortError") {
          throw new UpstreamTimeout("zarinpal_timeout");
        }
        const message = err instanceof Error ? err.message : "zarinpal_network";
        throw new UpstreamNetworkError(message);
      } finally {
        cleanup();
      }
    },
    {
      retries,
      minDelayMs: 200,
      maxDelayMs: 4_000,
      jitterRatio: 0.3,
      shouldRetry: (error, attempt) => {
        if (error instanceof UpstreamTimeout) return true;
        if (error instanceof UpstreamNetworkError) return true;
        if (error instanceof UpstreamBadResponse) {
          return error.status >= 500 && attempt < retries;
        }
        return false;
      },
    }
  );
}

function ensureMerchantId(): string {
  const merchant = process.env.ZARINPAL_MERCHANT_ID || "";
  if (!merchant) {
    throw new UpstreamBadResponse(500, "missing_merchant_id");
  }
  return merchant;
}

function cleanMobile(mobile?: string | null) {
  return (mobile || "").replace(/\D+/g, "");
}

function sanitizeCallbackUrl(callbackUrl: string): string {
  try {
    const url = new URL(callbackUrl);
    if (!url.hostname || /your\.site/i.test(url.hostname)) {
      throw new Error("invalid");
    }
    return url.toString();
  } catch {
    throw new UpstreamBadResponse(400, "invalid_callback_url");
  }
}

export async function requestPayment(
  input: {
    amount: number;
    description?: string;
    email?: string;
    mobile?: string;
    orderId?: string | number;
    currency?: "IRT" | "IRR";
    callbackUrl: string;
  },
  options?: CallOptions
): Promise<RequestPaymentResult> {
  const merchant_id = ensureMerchantId();
  const amount = Math.max(0, Math.floor(Number(input.amount || 0)));
  if (!amount) {
    throw new UpstreamBadResponse(400, "invalid_amount");
  }

  const callback_url = sanitizeCallbackUrl(input.callbackUrl);
  const description =
    input.description ||
    `پرداخت سفارش ${input.orderId ?? ""}`;

  const metadata: RequestPayload["metadata"] = {
    order_id: input.orderId ? String(input.orderId) : undefined,
    email: input.email || undefined,
    mobile: cleanMobile(input.mobile) || undefined,
  };

  const payload: RequestPayload = {
    merchant_id,
    amount,
    callback_url,
    description,
    metadata,
    currency: input.currency === "IRR" ? "IRR" : "IRT",
  };

  const { request, startPay } = resolveBaseUrls();

  const response = await callZarinpal<RequestResponseData>(
    request,
    payload,
    options
  );
  const data = response?.data;

  if (!data?.authority) {
    const errors = response?.errors || [];
    const message = errors?.[0]?.message ?? "zarinpal_missing_authority";
    throw new UpstreamBadResponse(502, message);
  }

  const code = Number(data.code ?? 100) || 100;

  return {
    authority: data.authority,
    url: `${startPay}${data.authority}`,
    code,
  };
}

export async function verifyPayment(
  input: { authority: string; amount: number; currency?: "IRT" | "IRR" },
  options?: CallOptions
): Promise<VerifyPaymentResult> {
  const merchant_id = ensureMerchantId();
  const authority = String(input.authority || "").trim();
  const amount = Math.max(0, Math.floor(Number(input.amount || 0)));

  if (!authority || !amount) {
    throw new UpstreamBadResponse(400, "invalid_input");
  }

  const payload: VerifyPayload = {
    merchant_id,
    authority,
    amount,
    currency: input.currency === "IRR" ? "IRR" : "IRT",
  };

  const { verify } = resolveBaseUrls();
  const response = await callZarinpal<VerifyResponseData>(
    verify,
    payload,
    options
  );
  const data = response?.data ?? {};

  const code = Number(data.code ?? 0) || 0;
  const paid = code === 100 || code === 101;

  return {
    code,
    paid,
    ref_id: data.ref_id,
    card_pan: data.card_pan,
    raw: data,
  };
}
