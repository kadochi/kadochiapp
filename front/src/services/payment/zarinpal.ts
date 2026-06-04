import "server-only";

import ZarinPal from "zarinpal-node-sdk";
import {
  UpstreamBadResponse,
  UpstreamNetworkError,
  UpstreamTimeout,
} from "@/services/http/errors";
import { toUpstreamNetworkError } from "@/services/http/serialize-fetch-error";
import { retry } from "@/services/http/retry";

interface ZarinpalApiResponse<T> {
  data?: T | null;
  errors?: Array<{ code?: number; message?: string | null }> | null;
}

interface RequestResponseData {
  code?: number;
  authority?: string;
  fee_type?: string;
  fee?: number;
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

let cachedClient: ZarinPal | null = null;
let cachedClientKey = "";

function resolveSandbox(): boolean {
  const mode = (process.env.ZARINPAL_MODE || "").toLowerCase().trim();
  if (mode === "sandbox") return true;
  if (mode === "production") return false;
  return process.env.NODE_ENV !== "production";
}

function getZarinpalClient(): ZarinPal {
  const merchantId = ensureMerchantId();
  const sandbox = resolveSandbox();
  const key = `${merchantId}:${sandbox}`;
  if (cachedClient && cachedClientKey === key) {
    return cachedClient;
  }
  cachedClient = new ZarinPal({ merchantId, sandbox });
  cachedClientKey = key;
  return cachedClient;
}

function createTimeoutController(
  timeoutMs: number,
  upstream?: AbortSignal | null | undefined,
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("timeout")),
    timeoutMs,
  );

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

function runWithAbortSignal<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new UpstreamTimeout("zarinpal_timeout"));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new UpstreamTimeout("zarinpal_timeout"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function mapSdkError(err: unknown, operation: string): never {
  if (err instanceof UpstreamTimeout) throw err;
  if (err instanceof UpstreamBadResponse) throw err;
  if (err instanceof UpstreamNetworkError) throw err;

  if (err instanceof Error && err.name === "AbortError") {
    throw new UpstreamTimeout("zarinpal_timeout");
  }

  const responseException = err as {
    getStatusCode?: () => number;
    message?: string;
  };
  if (typeof responseException?.getStatusCode === "function") {
    const status = responseException.getStatusCode();
    throw new UpstreamBadResponse(
      status >= 400 ? status : 502,
      responseException.message || "zarinpal_error",
    );
  }

  const axiosErr = err as {
    isAxiosError?: boolean;
    response?: { status?: number; data?: unknown };
    code?: string;
    message?: string;
  };
  if (axiosErr?.isAxiosError) {
    const status = axiosErr.response?.status;
    if (status && status >= 500) {
      throw new UpstreamBadResponse(status, "zarinpal_5xx");
    }
    if (status && status >= 400) {
      throw new UpstreamBadResponse(status, "zarinpal_bad_status");
    }
    throw toUpstreamNetworkError(err, { operation }, "[zarinpal/sdk]");
  }

  if (err instanceof Error) {
    const msg = err.message;
    if (/invalid|must be/i.test(msg)) {
      throw new UpstreamBadResponse(400, "zarinpal_validation_error");
    }
  }

  throw toUpstreamNetworkError(err, { operation }, "[zarinpal/sdk]");
}

async function withZarinpalRetry<T>(
  operation: string,
  fn: (attempt: number) => Promise<T>,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    signal,
  }: CallOptions = {},
): Promise<T> {
  return retry(
    async (attempt) => {
      const { signal: timeoutSignal, cleanup } = createTimeoutController(
        timeoutMs,
        signal,
      );
      console.log(`[zarinpal/sdk] attempt=${attempt} operation=${operation}`);
      try {
        return await runWithAbortSignal(fn(attempt), timeoutSignal);
      } catch (err) {
        mapSdkError(err, operation);
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
    },
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

/** Mobile in 09xxxxxxxxx form for SDK validation; omitted if not valid. */
function toSdkMobile(mobile?: string | null): string | undefined {
  const digits = cleanMobile(mobile);
  if (!digits) return undefined;

  let normalized = digits;
  if (digits.length === 12 && digits.startsWith("98")) {
    normalized = `0${digits.slice(2)}`;
  } else if (digits.length === 10 && digits.startsWith("9")) {
    normalized = `0${digits}`;
  }

  return /^09[0-9]{9}$/.test(normalized) ? normalized : undefined;
}

function toSdkEmail(email?: string | null): string | undefined {
  const trimmed = (email || "").trim();
  if (!trimmed) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : undefined;
}

function assertAbsoluteCallbackUrl(callbackUrl: string): void {
  try {
    const url = new URL(callbackUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("invalid");
    }
    if (!url.hostname || /your\.site/i.test(url.hostname)) {
      throw new Error("invalid");
    }
  } catch {
    throw new UpstreamBadResponse(400, "invalid_callback_url");
  }
}

/** Exact `ZARINPAL_CALLBACK_URL` from env (trimmed only); never joined with origin or site base. */
export function getZarinpalCallbackUrl(): string {
  const callbackUrl = (process.env.ZARINPAL_CALLBACK_URL || "").trim();
  if (!callbackUrl) {
    throw new UpstreamBadResponse(500, "missing_callback_url");
  }
  assertAbsoluteCallbackUrl(callbackUrl);
  return callbackUrl;
}

/** Callback URL with `order` query param so the gateway return survives lost session/cookies. */
export function getZarinpalCallbackUrlForOrder(
  orderId: string | number,
): string {
  const url = new URL(getZarinpalCallbackUrl());
  url.searchParams.set("order", String(orderId));
  return url.toString();
}

function sanitizeCallbackUrl(callbackUrl: string): string {
  const trimmed = callbackUrl.trim();
  assertAbsoluteCallbackUrl(trimmed);
  return trimmed;
}

/** ZarinPal defaults to IRR when currency is omitted; app amounts are IRT unless IRR. */
function resolveZarinpalCurrency(currency?: "IRT" | "IRR"): "IRT" | "IRR" {
  return currency === "IRR" ? "IRR" : "IRT";
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
  options?: CallOptions,
): Promise<RequestPaymentResult> {
  ensureMerchantId();
  const amount = Math.max(0, Math.floor(Number(input.amount || 0)));
  if (!amount) {
    throw new UpstreamBadResponse(400, "invalid_amount");
  }

  const callback_url = sanitizeCallbackUrl(input.callbackUrl);
  const description =
    input.description || `پرداخت سفارش ${input.orderId ?? ""}`;
  const mobile = toSdkMobile(input.mobile);
  const email = toSdkEmail(input.email);
  const currency = resolveZarinpalCurrency(input.currency);

  const response = await withZarinpalRetry(
    "payments.request",
    async () => {
      const zarinpal = getZarinpalClient();
      return zarinpal.request(
        "POST",
        "/pg/v4/payment/request.json",
        {
          amount,
          callback_url,
          description,
          mobile,
          email,
          currency,
          metadata: {
            order_id: input.orderId ? String(input.orderId) : undefined,
          },
        },
      ) as Promise<ZarinpalApiResponse<RequestResponseData>>;
    },
    options,
  );

  const data = response?.data;
  if (!data?.authority) {
    const errors = response?.errors || [];
    const message = errors?.[0]?.message ?? "zarinpal_missing_authority";
    console.error(
      `[zarinpal/requestPayment] no authority in response response=${JSON.stringify(response)}`,
    );
    throw new UpstreamBadResponse(502, message);
  }

  const zarinpal = getZarinpalClient();
  const code = Number(data.code ?? 100) || 100;
  const gatewayUrl = zarinpal.payments.getRedirectUrl(data.authority);

  console.log(
    `[zarinpal/requestPayment] success authority=${data.authority} gatewayUrl=${gatewayUrl} code=${code}`,
  );

  return {
    authority: data.authority,
    url: gatewayUrl,
    code,
  };
}

export async function verifyPayment(
  input: { authority: string; amount: number; currency?: "IRT" | "IRR" },
  options?: CallOptions,
): Promise<VerifyPaymentResult> {
  ensureMerchantId();
  const authority = String(input.authority || "").trim();
  const amount = Math.max(0, Math.floor(Number(input.amount || 0)));

  if (!authority || !amount) {
    throw new UpstreamBadResponse(400, "invalid_input");
  }

  const currency = resolveZarinpalCurrency(input.currency);

  const response = await withZarinpalRetry(
    "payments.verify",
    async () => {
      const zarinpal = getZarinpalClient();
      return zarinpal.request("POST", "/pg/v4/payment/verify.json", {
        authority,
        amount,
        currency,
      }) as Promise<ZarinpalApiResponse<VerifyResponseData>>;
    },
    options,
  );

  const data = response?.data ?? {};
  const code = Number(data.code ?? 0) || 0;
  const paid = code === 100 || code === 101;

  console.log(
    `[zarinpal/verifyPayment] authority=${authority} amount=${amount} code=${code} paid=${paid} ref_id=${data.ref_id} card_pan=${data.card_pan}`,
  );

  return {
    code,
    paid,
    ref_id: data.ref_id,
    card_pan: data.card_pan,
    raw: data,
  };
}
