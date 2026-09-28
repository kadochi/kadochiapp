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
export function inspectGatewayRedirect(url: string | undefined, methodId: string, config: { SNAPPPAY_BASE_URL?: string; SNAPPPAY_PAYMENT_HOSTS?: string }) {
  const allowedHosts = paymentProvider(methodId) === "snapppay" ? snapppayHosts(config) : zarinpalHosts;
  if (!url) return { trusted: false, reason: "missing_url", host: "", scheme: "", allowedHosts };
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const safeHost = host.length <= 253 && /^[a-z0-9.-]+$/.test(host) ? host : "";
    const scheme = parsed.protocol.replace(/:$/, "").toLowerCase();
    if (parsed.username || parsed.password) return { trusted: false, reason: "userinfo", host: safeHost, scheme, allowedHosts };
    if (scheme !== "https") return { trusted: false, reason: "non_https", host: safeHost, scheme, allowedHosts };
    if (!allowedHosts.includes(host)) return { trusted: false, reason: "host_not_allowed", host: safeHost, scheme, allowedHosts };
    return { trusted: true, reason: "trusted", host: safeHost, scheme, allowedHosts };
  } catch {
    return { trusted: false, reason: "malformed_url", host: "", scheme: "", allowedHosts };
  }
}

export function isTrustedGatewayRedirect(url: string | undefined, methodId: string, config: { SNAPPPAY_BASE_URL?: string; SNAPPPAY_PAYMENT_HOSTS?: string }): boolean {
  return inspectGatewayRedirect(url, methodId, config).trusted;
}
