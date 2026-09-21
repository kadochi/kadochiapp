import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Product } from "../types";
import { ProductDescription } from "./product-description";

const product: Product = {
  id: 42,
  name: "باکس گل",
  slug: "flower-box",
  description: [
    "<h2>عنوان اصلی</h2>",
    "<p>خط اول<br>خط دوم</p>",
    "<p><br></p>",
    "<h3>عنوان فرعی</h3>",
    '<p><a href="https://example.com">اطلاعات بیشتر</a></p>',
  ].join(""),
  shortDescription: "",
  price: { amount: "1250000", currencyCode: "IRR", minorUnit: 0 },
  images: [],
  categories: [{ id: 9, name: "گل", slug: "flower" }],
  tags: [],
  attributes: [],
  preparationHours: 24,
  expressDeliveryEligible: false,
  averageRating: 0,
  reviewCount: 0,
  inStock: true,
  purchasable: true,
};

describe("ProductDescription", () => {
  it("preserves WordPress rich-text structure inside the styled content scope", () => {
    const markup = renderToStaticMarkup(<ProductDescription product={product} />);

    expect(markup).toContain('class="product-description"');
    expect(markup).toContain('class="product-description-content"');
    expect(markup).toContain("<h2>عنوان اصلی</h2>");
    expect(markup).toContain("خط اول<br>خط دوم");
    expect(markup).toContain("<p><br></p>");
    expect(markup).toContain("<h3>عنوان فرعی</h3>");
    expect(markup).toContain('<a href="https://example.com">اطلاعات بیشتر</a>');
  });
});
