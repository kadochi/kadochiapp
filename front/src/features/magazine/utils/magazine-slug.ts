/** Decodes WordPress percent-encoded `post_name` values for frontend routes. */
export function decodeMagazineSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** Produces the stored WordPress `post_name` representation for REST lookups. */
export function wordpressMagazineSlug(slug: string): string {
  return encodeURIComponent(decodeMagazineSlug(slug));
}
