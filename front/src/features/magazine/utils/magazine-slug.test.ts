import { describe, expect, it } from "vitest";

import { decodeMagazineSlug, wordpressMagazineSlug } from "./magazine-slug";

describe("magazine slugs", () => {
  const encodedPersianSlug = "%d8%b1%d8%a7%d9%87%d9%86%d9%85%d8%a7%db%8c-%d8%ae%d8%b1%db%8c%d8%af-%da%a9%d8%a7%d8%af%d9%88";

  it("turns WordPress post names into readable frontend route values", () => {
    expect(decodeMagazineSlug(encodedPersianSlug)).toBe("راهنمای-خرید-کادو");
    expect(decodeMagazineSlug("gift-guide")).toBe("gift-guide");
  });

  it("encodes route values in the form WordPress stores and expects", () => {
    expect(wordpressMagazineSlug("راهنمای-خرید-کادو")).toBe("%D8%B1%D8%A7%D9%87%D9%86%D9%85%D8%A7%DB%8C-%D8%AE%D8%B1%DB%8C%D8%AF-%DA%A9%D8%A7%D8%AF%D9%88");
  });
});
