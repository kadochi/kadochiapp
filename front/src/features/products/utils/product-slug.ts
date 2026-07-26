/** Decodes WordPress's percent-encoded `post_name` values without rejecting malformed legacy data. */
export function decodeProductSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** Produces the `post_name` form expected by the WordPress REST API. */
export function wordpressProductSlug(slug: string): string {
  return encodeURIComponent(decodeProductSlug(slug));
}
