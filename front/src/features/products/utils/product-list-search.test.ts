import { describe, expect, it } from "vitest";

import {
  parseProductListSearchParams,
  productCategoryPath,
  productListPathWithCategory,
} from "./product-list-search";

describe("product list URLs", () => {
  it("parses category IDs and slugs as category references", () => {
    expect(parseProductListSearchParams({ category: "42" }).category).toBe("42");
    expect(parseProductListSearchParams({ category: "flower" }).category).toBe("flower");
  });

  it("generates encoded slug-based category links", () => {
    expect(productCategoryPath("گل و گیاه")).toBe(
      "/products?category=%DA%AF%D9%84+%D9%88+%DA%AF%DB%8C%D8%A7%D9%87",
    );
  });

  it("replaces only the category while preserving all other query values", () => {
    const path = productListPathWithCategory(
      {
        category: ["42", "discarded-duplicate"],
        q: "gift box",
        tag: ["birthday", "fast-delivery"],
        page: "3",
        utm_source: "legacy",
      },
      "گل و گیاه",
    );
    const url = new URL(path, "https://kadochi.example");

    expect(url.pathname).toBe("/products");
    expect(url.searchParams.getAll("category")).toEqual(["گل و گیاه"]);
    expect(url.searchParams.get("q")).toBe("gift box");
    expect(url.searchParams.getAll("tag")).toEqual(["birthday", "fast-delivery"]);
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("utm_source")).toBe("legacy");
  });
});
