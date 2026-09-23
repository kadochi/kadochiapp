import { describe, expect, it } from "vitest";

import { ServiceError } from "@/lib/http/errors";
import { paymentErrorMessage } from "./payment-error";

function zarinpalError(code: number, category: "configuration" | "temporarily_unavailable" | "rejected" | "cancelled" | "unknown") {
  return new ServiceError({
    code: "upstream_failure",
    status: 422,
    message: "The payment gateway could not start a payment.",
    requestId: "request-123",
    retryable: category === "temporarily_unavailable",
    payment: { provider: "zarinpal", code, category },
  });
}

describe("paymentErrorMessage", () => {
  it("uses documented ZarinPal terminal configuration guidance", () => {
    expect(paymentErrorMessage(zarinpalError(-11, "configuration"))).toMatchObject({
      code: -11,
      requestId: "request-123",
      message: "درگاه پرداخت فروشگاه فعال نیست. لطفاً بعداً تلاش کنید یا با پشتیبانی تماس بگیرید.",
    });
  });

  it("tells customers when ZarinPal asks them to retry later", () => {
    expect(paymentErrorMessage(zarinpalError(-12, "temporarily_unavailable"))).toMatchObject({
      code: -12,
      retryable: true,
      message: "تعداد درخواست‌های پرداخت زیاد است. چند دقیقه دیگر دوباره تلاش کنید.",
    });
  });

  it("does not expose generic upstream detail", () => {
    expect(paymentErrorMessage(new Error("merchant=secret"))).toEqual({
      message: "شروع پرداخت انجام نشد. لطفاً دوباره تلاش کنید.",
      retryable: false,
    });
  });

  it("explains that an existing payment attempt is still being recovered", () => {
    expect(paymentErrorMessage(new ServiceError({
      code: "payment_in_progress",
      status: 409,
      message: "internal detail",
      requestId: "request-123",
      retryable: true,
      retryAfter: 12,
    }))).toMatchObject({
      requestId: "request-123",
      retryable: true,
      message: "پرداخت قبلی هنوز در حال شروع است. لطفاً چند لحظه بعد دوباره بررسی کنید.",
    });
  });
});

describe("paymentErrorMessage for Snapp! Pay", () => {
  function snapppayError(code: number | undefined, category: "configuration" | "temporarily_unavailable" | "rejected" | "unknown") {
    return new ServiceError({
      code: "upstream_failure",
      status: 422,
      message: "The payment gateway could not start a payment.",
      requestId: "request-9",
      retryable: category === "temporarily_unavailable",
      payment: { provider: "snapppay", ...(code === undefined ? {} : { code }), category },
    });
  }

  it("uses Snapp's customer-safe wording for credit ineligibility", () => {
    expect(paymentErrorMessage(snapppayError(1048, "rejected")).message).toBe("امکان استفاده از سرویس اعتباری را ندارید. لطفاً روش پرداخت دیگری انتخاب کنید.");
  });

  it("maps invalid mobile and temporary outages", () => {
    expect(paymentErrorMessage(snapppayError(1005, "rejected")).message).toContain("شماره موبایل");
    expect(paymentErrorMessage(snapppayError(1000, "temporarily_unavailable"))).toMatchObject({ retryable: true, code: 1000 });
  });

  it("falls back to category copy for untagged failures", () => {
    expect(paymentErrorMessage(snapppayError(undefined, "rejected")).message).toBe("اسنپ‌پی این پرداخت را نپذیرفت. لطفاً روش پرداخت دیگری انتخاب کنید.");
  });

  it("surfaces an unavailable selected method as a choose-again message", () => {
    expect(paymentErrorMessage(new ServiceError({
      code: "validation",
      status: 400,
      message: "The selected payment method is no longer available.",
      requestId: "request-9",
      retryable: false,
      fieldErrors: { paymentMethodId: ["این روش پرداخت برای مبلغ فعلی سفارش در دسترس نیست. روش دیگری انتخاب کنید."] },
    })).message).toContain("روش دیگری انتخاب کنید");
  });
});
