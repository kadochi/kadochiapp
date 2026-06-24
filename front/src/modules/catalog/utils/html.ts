export function stripHtml(html?: string | null): string | undefined {
  if (!html) return html ?? undefined;
  return html.replace(/<[^>]+>/g, "").trim();
}
