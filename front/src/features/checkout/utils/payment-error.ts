import { ServiceError, apiErrorSchema } from "@/lib/http/errors";

type PaymentError = {
  message: string;
  requestId?: string;
  code?: number;
  retryable: boolean;
};

const zarinpalMessages: Record<number, string> = {
  "-9": "اطلاعات ارسال‌شده به درگاه معتبر نیست. لطفاً اطلاعات سفارش را بررسی کنید.",
  "-10": "تنظیمات درگاه پرداخت معتبر نیست. لطفاً با پشتیبانی تماس بگیرید.",
  "-11": "درگاه پرداخت فروشگاه فعال نیست. لطفاً بعداً تلاش کنید یا با پشتیبانی تماس بگیرید.",
  "-12": "تعداد درخواست‌های پرداخت زیاد است. چند دقیقه دیگر دوباره تلاش کنید.",
  "-15": "امکان انجام پرداخت از این درگاه وجود ندارد. لطفاً با پشتیبانی تماس بگیرید.",
  "-16": "سطح دسترسی درگاه برای این پرداخت کافی نیست. لطفاً با پشتیبانی تماس بگیرید.",
  "-17": "تنظیمات حساب درگاه کامل نیست. لطفاً با پشتیبانی تماس بگیرید.",
  "-18": "نشانی بازگشت درگاه با تنظیمات فروشگاه هم‌خوانی ندارد. لطفاً با پشتیبانی تماس بگیرید.",
  "-19": "این تراکنش توسط درگاه پذیرفته نشد. لطفاً با پشتیبانی تماس بگیرید.",
  "-51": "پرداخت لغو شد.",
};

/** Converts the safe BFF payment contract into customer-facing Persian copy. */
export function paymentErrorMessage(error: unknown, fallback = "شروع پرداخت انجام نشد. لطفاً دوباره تلاش کنید."): PaymentError {
  const detail = error instanceof ServiceError
    ? error.detail
    : typeof error === "object" && error !== null && "detail" in error
      ? apiErrorSchema.safeParse((error as { detail: unknown }).detail).data
      : undefined;
  if (!detail?.payment || detail.payment.provider !== "zarinpal") {
    if (detail?.code === "payment_in_progress") {
      return {
        message: "پرداخت قبلی هنوز در حال شروع است. لطفاً چند لحظه بعد دوباره بررسی کنید.",
        requestId: detail.requestId,
        retryable: true,
      };
    }
    return { message: fallback, retryable: false };
  }
  const code = detail.payment.code;
  const categoryMessage = detail.payment.category === "cancelled"
    ? "پرداخت لغو شد."
    : detail.payment.category === "temporarily_unavailable"
      ? "درگاه پرداخت موقتاً در دسترس نیست. چند دقیقه دیگر دوباره تلاش کنید."
      : detail.payment.category === "configuration"
        ? "تنظیمات درگاه پرداخت نیاز به بررسی دارد. لطفاً با پشتیبانی تماس بگیرید."
        : fallback;
  return {
    message: code !== undefined ? zarinpalMessages[code] ?? categoryMessage : categoryMessage,
    requestId: detail.requestId,
    code,
    retryable: detail.retryable,
  };
}

/** Browser diagnostics deliberately contain only support-safe identifiers. */
export function logPaymentFailure(event: string, error: unknown): void {
  const payment = paymentErrorMessage(error);
  console.error("[payment]", {
    event,
    provider: "zarinpal",
    requestId: payment.requestId,
    gatewayCode: payment.code,
    retryable: payment.retryable,
  });
}
