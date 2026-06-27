import "server-only"
import {
  UpstreamBadResponse,
} from "@/services/http/errors"
import { getZarinpalClient, ensureMerchantId, withZarinpalRetry, toSdkMobile, toSdkEmail, assertAbsoluteCallbackUrl, resolveZarinpalCurrency } from "./payment.utils"
import type { CallOptions, RequestPaymentResult, VerifyPaymentResult, ZarinpalApiResponse, RequestResponseData, VerifyResponseData } from "./payment.types"

export function getZarinpalCallbackUrl(): string {
  const callbackUrl = (process.env.ZARINPAL_CALLBACK_URL || "").trim()
  if (!callbackUrl) {
    throw new UpstreamBadResponse(500, "missing_callback_url")
  }
  assertAbsoluteCallbackUrl(callbackUrl)
  return callbackUrl
}

export function getZarinpalCallbackUrlForOrder(
  orderId: string | number,
): string {
  const url = new URL(getZarinpalCallbackUrl())
  url.searchParams.set("order", String(orderId))
  return url.toString()
}

export async function requestPayment(
  input: {
    amount: number
    description?: string
    email?: string
    mobile?: string
    orderId?: string | number
    currency?: "IRT" | "IRR"
    callbackUrl: string
  },
  options?: CallOptions,
): Promise<RequestPaymentResult> {
  ensureMerchantId()
  const amount = Math.max(0, Math.floor(Number(input.amount || 0)))
  if (!amount) {
    throw new UpstreamBadResponse(400, "invalid_amount")
  }

  const callback_url = (() => {
    assertAbsoluteCallbackUrl(input.callbackUrl)
    return input.callbackUrl.trim()
  })()
  const description = input.description || `پرداخت سفارش ${input.orderId ?? ""}`
  const mobile = toSdkMobile(input.mobile)
  const email = toSdkEmail(input.email)
  const currency = resolveZarinpalCurrency(input.currency)

  const response = await withZarinpalRetry(
    "payments.request",
    async () => {
      const zarinpal = getZarinpalClient()
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
      ) as Promise<ZarinpalApiResponse<RequestResponseData>>
    },
    options,
  )

  const data = response?.data
  if (!data?.authority) {
    const errors = response?.errors || []
    const message = errors?.[0]?.message ?? "zarinpal_missing_authority"
    throw new UpstreamBadResponse(502, message)
  }

  const zarinpal = getZarinpalClient()
  const code = Number(data.code ?? 100) || 100
  const gatewayUrl = zarinpal.payments.getRedirectUrl(data.authority)

  return {
    authority: data.authority,
    url: gatewayUrl,
    code,
  }
}

export async function verifyPayment(
  input: { authority: string; amount: number; currency?: "IRT" | "IRR" },
  options?: CallOptions,
): Promise<VerifyPaymentResult> {
  ensureMerchantId()
  const authority = String(input.authority || "").trim()
  const amount = Math.max(0, Math.floor(Number(input.amount || 0)))

  if (!authority || !amount) {
    throw new UpstreamBadResponse(400, "invalid_input")
  }

  const currency = resolveZarinpalCurrency(input.currency)

  const response = await withZarinpalRetry(
    "payments.verify",
    async () => {
      const zarinpal = getZarinpalClient()
      return zarinpal.request("POST", "/pg/v4/payment/verify.json", {
        authority,
        amount,
        currency,
      }) as Promise<ZarinpalApiResponse<VerifyResponseData>>
    },
    options,
  )

  const data = response?.data ?? {}
  const code = Number(data.code ?? 0) || 0
  const paid = code === 100 || code === 101

  return {
    code,
    paid,
    ref_id: data.ref_id,
    card_pan: data.card_pan,
    raw: data,
  }
}
