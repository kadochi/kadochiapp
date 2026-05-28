function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/** Server-side WordPress REST base URL (`WP_BASE_URL`). */
export function getWpBaseUrl(): string {
  const url = process.env.WP_BASE_URL;
  if (!url) throw new Error("WP_BASE_URL is not configured");
  return trimTrailingSlash(url);
}

/** Server-side WooCommerce REST base URL (`WOO_BASE_URL`). */
export function getWooBaseUrl(): string {
  const url = process.env.WOO_BASE_URL;
  if (!url) throw new Error("WOO_BASE_URL is not configured");
  return trimTrailingSlash(url);
}

/**
 * WP proxy route base URL — prefers server env, falls back to public env
 * when both are set for Docker/local split setups.
 */
export function getWpProxyBaseUrl(): string {
  const url = process.env.WP_BASE_URL || process.env.NEXT_PUBLIC_WP_BASE_URL;
  if (!url) {
    throw new Error(
      "WP_BASE_URL or NEXT_PUBLIC_WP_BASE_URL is not configured",
    );
  }
  return trimTrailingSlash(url);
}

/** Client-side direct WordPress base URL (`NEXT_PUBLIC_WP_BASE_URL`). */
export function getPublicWpBaseUrl(): string {
  const url = tryGetPublicWpBaseUrl();
  if (!url) throw new Error("NEXT_PUBLIC_WP_BASE_URL is not configured");
  return url;
}

/** Returns public WP base URL when configured; otherwise null (no fallback). */
export function tryGetPublicWpBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_WP_BASE_URL;
  return url ? trimTrailingSlash(url) : null;
}
