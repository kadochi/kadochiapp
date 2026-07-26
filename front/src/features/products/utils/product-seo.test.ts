import { describe, expect, it } from "vitest";

import type { Product } from "../types";
import {
  productBreadcrumbJsonLd,
  productJsonLd,
  productPath,
  serializeJsonLd,
} from "./product-seo";

const product: Product = {
  id: 42,
  name: "باکس گل <ویژه>",
  slug: "باکس گل",
  description: "<p>توضیحات <strong>محصول</strong></p>",
  shortDescription: "",
  price: { amount: "1250000", currencyCode: "IRR", minorUnit: 0 },
  images: [{ id: 1, url: "https://cdn.example.com/product.jpg", alt: "باکس گل" }],
  categories: [{ id: 9, name: "گل", slug: "flower" }],
  tags: [],
  attributes: [{ name: "رنگ", value: "قرمز" }],
  averageRating: 4.7,
  reviewCount: 12,
  inStock: true,
  purchasable: true,
};

describe("product SEO markup", () => {
  const siteUrl = new URL("https://kadochi.com");

  it("uses a URL-safe canonical product path", () => {
    expect(productPath(product.slug)).toBe("/product/%D8%A8%D8%A7%DA%A9%D8%B3%20%DA%AF%D9%84");
  });

  it("emits a Merchant Listings-compatible Product and Offer", () => {
    expect(productJsonLd(product, siteUrl)).toMatchObject({
      "@type": "Product",
      description: "توضیحات محصول",
      image: ["https://cdn.example.com/product.jpg"],
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        price: "1250000",
        priceCurrency: "IRR",
      },
      aggregateRating: { ratingValue: 4.7, reviewCount: 12 },
    });
  });

  it("keeps the visible breadcrumb trail machine-readable", () => {
    const jsonLd = productBreadcrumbJsonLd(product, siteUrl);
    expect(jsonLd.itemListElement).toHaveLength(4);
    expect(jsonLd.itemListElement[2]).toMatchObject({ name: "گل", position: 3 });
    expect(jsonLd.itemListElement[3].item).toBe("https://kadochi.com/product/%D8%A8%D8%A7%DA%A9%D8%B3%20%DA%AF%D9%84");
  });

  it("escapes JSON-LD inserted into a script element", () => {
    expect(serializeJsonLd({ name: "</script><script>" })).not.toContain("</script>");
  });
});
