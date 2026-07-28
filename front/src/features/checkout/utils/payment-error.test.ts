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
});
