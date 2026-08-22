const publicWordPressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL ?? "http://localhost:8080";
const internalWordPressUrl = process.env.WORDPRESS_INTERNAL_URL ?? "http://wordpress";

/**
 * The browser only ever sends this URL back to Next's optimizer. In local
 * Docker development, WordPress advertises localhost URLs, but localhost from
 * the frontend container is not the WordPress container. Keep that translation
 * strictly development-only and only for the uploads path.
 */
export function wordpressMediaUrl(value: string): string {
  if (process.env.NODE_ENV !== "development") return value;

  try {
    const source = new URL(value);
    if (source.origin !== new URL(publicWordPressUrl).origin || !source.pathname.startsWith("/wp-content/uploads/")) return value;
    return new URL(`${source.pathname}${source.search}`, internalWordPressUrl).toString();
  } catch {
    return value;
  }
}
