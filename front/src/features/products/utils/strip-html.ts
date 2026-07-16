/** Strips HTML tags and collapses whitespace, e.g. for metadata descriptions or untrusted review content. */
export function stripHtml(input?: string | null): string {
  if (!input) return "";
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
