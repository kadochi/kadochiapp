import type { z } from "zod";
import { wordpressMediaUrl } from "@/lib/server/wordpress-media";
import { canReceiveToday } from "@/lib/delivery/same-day";
import { productSchema, type upstreamProductSchemaExport } from "../schema/products";
import { decodeProductSlug } from "./product-slug";

type UpstreamProduct = z.infer<typeof upstreamProductSchemaExport>;

function money(amount: string, prices: UpstreamProduct["prices"]) {
  return { amount, currencyCode: prices.currency_code, minorUnit: prices.currency_minor_unit };
}

export function mapProduct(product: UpstreamProduct) {
  const rating = Number.parseFloat(String(product.average_rating ?? ""));
  const extension = product.extensions.kadochi;
  const deliveryData = extension && typeof extension === "object" ? extension as { preparationHours?: unknown; preparation_hours?: unknown } : {};
  const rawPreparationHours = deliveryData.preparationHours ?? deliveryData.preparation_hours;
  const preparationHours = typeof rawPreparationHours === "number" && Number.isInteger(rawPreparationHours) && rawPreparationHours >= 1 && rawPreparationHours <= 720
    ? rawPreparationHours
    : 24;

  return productSchema.parse({
    id: product.id,
    name: product.name,
    // Woo's Store API exposes imported Persian `post_name` values as percent
    // encoded strings. Next decodes route segments before passing them to the
    // page, so product links must use the matching decoded representation.
    slug: decodeProductSlug(product.slug),
    description: product.description ?? "",
    shortDescription: product.short_description ?? "",
    price: money(product.prices.price, product.prices),
    regularPrice: product.prices.regular_price ? money(product.prices.regular_price, product.prices) : undefined,
    salePrice: product.prices.sale_price ? money(product.prices.sale_price, product.prices) : undefined,
    images: product.images.map((image) => ({
      id: image.id,
      url: wordpressMediaUrl(image.src),
      thumbnailUrl: image.thumbnail ? wordpressMediaUrl(image.thumbnail) : undefined,
      alt: image.alt ?? "",
    })),
    categories: product.categories,
    tags: product.tags
      .map((tag) => ({ id: tag.id, name: tag.name.trim(), slug: tag.slug.trim() }))
      .filter((tag) => tag.name && tag.slug),
    attributes: product.attributes
      .map((attribute) => ({
        name: attribute.name.trim(),
        value: attribute.terms.map((term) => term.name.trim()).filter(Boolean).join("، "),
      }))
      .filter((attribute) => attribute.name && attribute.value),
    preparationHours,
    expressDeliveryEligible: canReceiveToday(preparationHours),
    averageRating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0,
    reviewCount: product.review_count ?? 0,
    inStock: product.is_in_stock,
    purchasable: product.is_purchasable,
  });
}
