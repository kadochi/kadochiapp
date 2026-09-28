import { describe, expect, it } from "vitest";

import { inspectGatewayRedirect, isTrustedGatewayRedirect, paymentProvider, snapppayHosts } from "./redirect-hosts";

const config = { SNAPPPAY_BASE_URL: "https://snapp.example/", SNAPPPAY_PAYMENT_HOSTS: " Pay.Snapp.example ,bad host," };

describe("isTrustedGatewayRedirect", () => {
  it("keeps ZarinPal limited to its two payment hosts", () => {
    expect(isTrustedGatewayRedirect("https://payment.zarinpal.com/pg/StartPay/a", "WC_ZPal", config)).toBe(true);
    expect(isTrustedGatewayRedirect("https://sandbox.zarinpal.com/pg/StartPay/a", "WC_ZPal", config)).toBe(true);
    expect(isTrustedGatewayRedirect("http://payment.zarinpal.com/pg/StartPay/a", "WC_ZPal", config)).toBe(false);
    expect(isTrustedGatewayRedirect("https://pay.snapp.example/a", "WC_ZPal", config)).toBe(false);
  });

  it("accepts Snapp! Pay's API and configured page hosts over HTTPS only", () => {
    expect(snapppayHosts(config)).toEqual(["pay.snapp.example", "snapp.example"]);
    expect(isTrustedGatewayRedirect("https://pay.snapp.example/a", "kadochi_snapppay", config)).toBe(true);
    expect(isTrustedGatewayRedirect("https://snapp.example/a", "kadochi_snapppay", config)).toBe(true);
    expect(isTrustedGatewayRedirect("http://pay.snapp.example/a", "kadochi_snapppay", config)).toBe(false);
    expect(isTrustedGatewayRedirect("https://payment.zarinpal.com/a", "kadochi_snapppay", config)).toBe(false);
    expect(isTrustedGatewayRedirect("https://user:pw@pay.snapp.example/a", "kadochi_snapppay", config)).toBe(false);
    expect(isTrustedGatewayRedirect("not a url", "kadochi_snapppay", config)).toBe(false);
  });

  it("explains rejected Snapp redirects using only their origin and configured hosts", () => {
    const rejected = inspectGatewayRedirect("https://other.example/pay/secret-token?token=secret-token", "kadochi_snapppay", config);
    expect(rejected).toEqual({
      trusted: false,
      reason: "host_not_allowed",
      host: "other.example",
      scheme: "https",
      allowedHosts: ["pay.snapp.example", "snapp.example"],
    });
    expect(JSON.stringify(rejected)).not.toContain("secret-token");
    expect(inspectGatewayRedirect("http://snapp.example/pay", "kadochi_snapppay", config).reason).toBe("non_https");
    expect(inspectGatewayRedirect("https://user:pass@snapp.example/pay", "kadochi_snapppay", config).reason).toBe("userinfo");
    expect(inspectGatewayRedirect("not a url", "kadochi_snapppay", config).reason).toBe("malformed_url");
  });

  it("maps gateway IDs to providers", () => {
    expect(paymentProvider("kadochi_snapppay")).toBe("snapppay");
    expect(paymentProvider("WC_ZPal")).toBe("zarinpal");
  });
});
