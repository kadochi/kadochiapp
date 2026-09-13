import { describe, expect, it } from "vitest";

import { isTrustedPaymentRedirect, paymentProviderByGatewayId, paymentProviderById } from "./providers";

describe("payment provider registry", () => {
  it("maps the configured Woo gateway to its provider adapter", () => {
    expect(paymentProviderByGatewayId("WC_ZPal")?.id).toBe("zarinpal");
    expect(paymentProviderByGatewayId("WC_Unknown")).toBeUndefined();
  });

  it("accepts exact provider handoff hosts only", () => {
    const provider = paymentProviderById("zarinpal")!;
    expect(isTrustedPaymentRedirect(provider, "https://payment.zarinpal.com/pg/StartPay/session")).toBe(true);
    expect(isTrustedPaymentRedirect(provider, "https://payment.zarinpal.com.attacker.test/pg/StartPay/session")).toBe(false);
    expect(isTrustedPaymentRedirect(provider, "https://payment.zarinpal.com@attacker.test/pg/StartPay/session")).toBe(false);
    expect(isTrustedPaymentRedirect(provider, "http://payment.zarinpal.com/pg/StartPay/session")).toBe(false);
  });
});
