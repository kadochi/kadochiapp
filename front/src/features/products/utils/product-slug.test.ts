import { describe, expect, it } from "vitest";

import { decodeProductSlug, wordpressProductSlug } from "./product-slug";

describe("product slugs", () => {
  const encodedPersianSlug = "%da%af%d9%84%d8%af%d8%a7%d9%86-%da%af%d9%84";

  it("converts WordPress percent-encoded post names into frontend route values", () => {
    expect(decodeProductSlug(encodedPersianSlug)).toBe("گلدان-گل");
    expect(decodeProductSlug("gift-box")).toBe("gift-box");
  });

  it("keeps malformed legacy values usable and re-encodes lookup values", () => {
    expect(decodeProductSlug("%not-a-slug")).toBe("%not-a-slug");
    expect(wordpressProductSlug("گلدان-گل")).toBe("%DA%AF%D9%84%D8%AF%D8%A7%D9%86-%DA%AF%D9%84");
  });
});
