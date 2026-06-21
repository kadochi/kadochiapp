import "server-only";

function headerFirst(value: string | null): string | null {
  const v = value?.split(",")[0]?.trim();
  return v || null;
}

function originFromProtoAndHost(proto: string, host: string): string {
  const cleanProto = proto.replace(/:$/, "");
  return `${cleanProto}://${host}`;
}

function isInvalidRedirectHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return !hostname || hostname === "0.0.0.0";
}

/** Public browser-facing origin for server-side redirects behind Docker/Traefik. */
export function getPublicSiteOrigin(req: Request): string {
  const forwardedHost = headerFirst(req.headers.get("x-forwarded-host"));
  const forwardedProto = headerFirst(req.headers.get("x-forwarded-proto"));

  if (forwardedHost && !isInvalidRedirectHost(forwardedHost)) {
    const proto =
      forwardedProto ||
      (process.env.NODE_ENV === "production" ? "https" : "http");
    return originFromProtoAndHost(proto, forwardedHost);
  }

  const host = headerFirst(req.headers.get("host"));
  if (host && !isInvalidRedirectHost(host)) {
    const proto =
      forwardedProto ||
      (process.env.NODE_ENV === "production" ? "https" : "http");
    return originFromProtoAndHost(proto, host);
  }

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      return fromEnv;
    }
  }

  return new URL(req.url).origin;
}
