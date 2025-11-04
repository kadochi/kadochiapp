// Very small sanitization helpers (server-side). Replace with a stricter sanitizer if needed.
export function stripHtml(html?: string): string | undefined {
  if (!html) return html;
  return html.replace(/<[^>]+>/g, "").trim();
}
