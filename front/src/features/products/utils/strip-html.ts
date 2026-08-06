const namedHtmlEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  lt: "<",
  nbsp: " ",
  quot: "\"",
};

function decodeHtmlEntitiesOnce(value: string) {
  return value.replace(/&(#(?:x[\da-f]+|\d+)|[a-z][\da-z]+);/gi, (entity, encoded: string) => {
    if (!encoded.startsWith("#")) return namedHtmlEntities[encoded.toLowerCase()] ?? entity;

    const isHex = encoded[1]?.toLowerCase() === "x";
    const codePoint = Number.parseInt(encoded.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : entity;
  });
}

/** Decodes twice-escaped entities emitted by some WooCommerce category descriptions. */
function decodeHtmlEntities(value: string) {
  let decoded = value;
  // WooCommerce may return `&amp;#8230;`, which needs two decoding passes to
  // become the visible ellipsis character rather than literal entity text.
  for (let pass = 0; pass < 2; pass += 1) {
    const next = decodeHtmlEntitiesOnce(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

/** Strips HTML tags, decodes entities, and collapses whitespace for plain-text UI copy. */
export function stripHtml(input?: string | null): string {
  if (!input) return "";
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
