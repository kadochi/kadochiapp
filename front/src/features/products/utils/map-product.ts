import type { z } from "zod";
import { productSchema, type upstreamProductSchemaExport } from "../schema/products";

type UpstreamProduct = z.infer<typeof upstreamProductSchemaExport>;

function money(amount: string, prices: UpstreamProduct["prices"]) {
  return { amount, currencyCode: prices.currency_code, minorUnit: prices.currency_minor_unit };
}

export function mapProduct(product: UpstreamProduct) {
  const rating = Number.parseFloat(String(product.average_rating ?? ""));

  return productSchema.parse({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    shortDescription: product.short_description ?? "",
    price: money(product.prices.price, product.prices),
    regularPrice: product.prices.regular_price ? money(product.prices.regular_price, product.prices) : undefined,
    salePrice: product.prices.sale_price ? money(product.prices.sale_price, product.prices) : undefined,
    images: product.images.map((image) => ({ id: image.id, url: image.src, thumbnailUrl: image.thumbnail, alt: image.alt ?? "" })),
    categories: product.categories,
    attributes: product.attributes
      .map((attribute) => ({
        name: attribute.name.trim(),
        value: attribute.terms.map((term) => term.name.trim()).filter(Boolean).join("، "),
      }))
      .filter((attribute) => attribute.name && attribute.value),
    averageRating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0,
    reviewCount: product.review_count ?? 0,
    inStock: product.is_in_stock,
    purchasable: product.is_purchasable,
  });
}
