export const ZARINPAL_GATEWAY_ID = "WC_ZPal";
export const SNAPPPAY_GATEWAY_ID = "kadochi_snapppay";

export type PaymentProvider = "zarinpal" | "snapppay";

export function paymentProvider(methodId: string): PaymentProvider {
  return methodId === SNAPPPAY_GATEWAY_ID ? "snapppay" : "zarinpal";
}

const zarinpalHosts = ["payment.zarinpal.com", "sandbox.zarinpal.com"];

/** Snapp! Pay hosts: the API host plus any configured payment-page hosts. */
export function snapppayHosts(config: { SNAPPPAY_BASE_URL?: string; SNAPPPAY_PAYMENT_HOSTS?: string }): string[] {
  const hosts = (config.SNAPPPAY_PAYMENT_HOSTS ?? "").split(",").map((host) => host.trim().toLowerCase());
  if (config.SNAPPPAY_BASE_URL) {
    try {
      hosts.push(new URL(config.SNAPPPAY_BASE_URL).hostname.toLowerCase());
    } catch {
      // Ignored: an invalid base URL contributes no trusted host.
    }
  }
  return [...new Set(hosts.filter((host) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)))];
}

/**
 * Accepts only a gateway's own handoff hosts, so a compromised or misconfigured
 * upstream cannot send customers to an arbitrary site. Snapp! Pay requires HTTPS.
 */
export function isTrustedGatewayRedirect(url: string | undefined, methodId: string, config: { SNAPPPAY_BASE_URL?: string; SNAPPPAY_PAYMENT_HOSTS?: string }): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    if (paymentProvider(methodId) === "snapppay") return parsed.protocol === "https:" && snapppayHosts(config).includes(host);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && zarinpalHosts.includes(host);
  } catch {
    return false;
  }
}
