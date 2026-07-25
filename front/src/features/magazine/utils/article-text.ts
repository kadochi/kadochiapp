/** Converts WordPress-rendered fragments into concise, safe plain text. */
export function articleText(input?: string | null): string {
  if (!input) return "";

  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#[0-9]+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Persian articles are typically read at roughly 180 words per minute. */
export function readingTime(input?: string | null): number {
  const words = articleText(input).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

export function formatMagazineDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}
