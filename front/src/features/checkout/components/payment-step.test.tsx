import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/toaster", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import type { CheckoutState } from "../types";
import { PaymentStep } from "./checkout-flow";

const money = (amount: string) => ({ amount, currencyCode: "IRR", minorUnit: 0 });

function state(paymentMethods: CheckoutState["paymentMethods"]) {
  return {
    cart: { coupons: [], totals: { totalItems: money("58000000"), totalDiscount: money("0"), totalShipping: money("0"), totalTax: money("0"), totalPrice: money("58000000") } },
    paymentMethods,
  } as unknown as CheckoutState;
}

const zarinpal = { id: "WC_ZPal", title: "پرداخت آنلاین", description: "از طریق درگاه پرداخت الکترونیک", provider: "zarinpal" as const };
const snapppay = { id: "kadochi_snapppay", title: "۴ قسط ماهانه، بدون سود", description: "بدون چک و ضامن", provider: "snapppay" as const };

function render(methods: CheckoutState["paymentMethods"], selected: string, notice: string | null = null) {
  return renderToStaticMarkup(<PaymentStep
    couponPending={null}
    paymentMethodId={selected}
    paymentMethodNotice={notice}
    state={state(methods)}
    onApplyCoupon={async () => true}
    onPaymentMethod={() => undefined}
    onRemoveCoupon={async () => undefined}
  />);
}

describe("PaymentStep", () => {
  it("renders Snapp! Pay with its logo and eligibility text verbatim", () => {
    const html = render([zarinpal, snapppay], "kadochi_snapppay");
    expect(html).toContain("/images/payment/snapppay.svg");
    expect(html).toContain("۴ قسط ماهانه، بدون سود");
    expect(html).toContain("بدون چک و ضامن");
    expect(html).toMatch(/value="kadochi_snapppay"[^>]*data-state="checked"|data-state="checked"[^>]*value="kadochi_snapppay"/);
  });

  it("renders only ZarinPal when Snapp! Pay is not offered and shows the fallback note", () => {
    const html = render([zarinpal], "WC_ZPal", "روش پرداخت انتخاب‌شده در دسترس نیست");
    expect(html).not.toContain("snapppay.svg");
    expect(html).toContain("پرداخت آنلاین");
    expect(html).toContain("روش پرداخت انتخاب‌شده در دسترس نیست");
  });
});
