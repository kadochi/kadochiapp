import type { Product } from "../types";
import { stripHtml } from "./strip-html";

type Money = Product["price"];

const schemaOrg = "https://schema.org";

/**
 * Produces an exact decimal amount for schema.org instead of the Persian
 * Toman amount used in the storefront UI. WooCommerce supplies the source
 * price in the currency's minor unit, so keeping its ISO currency and amount
 * together makes Merchant Listings unambiguous.
 */
function schemaPrice({ amount, minorUnit }: Money): string {
  const value = BigInt(amount);
  if (minorUnit === 0) return value.toString();

  const digits = value.toString().padStart(minorUnit + 1, "0");
  const whole = digits.slice(0, -minorUnit);
  const fraction = digits.slice(-minorUnit).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

/** Converts WooCommerce's minor-unit price to the Toman amount used by product feeds. */
export function productPriceInToman({ amount, currencyCode, minorUnit }: Money): string {
  const divisor = BigInt(10) ** BigInt(minorUnit + (currencyCode === "IRR" ? 1 : 0));
  return (BigInt(amount) / divisor).toString();
}

/** Returns a previous price only when the product is currently discounted. */
export function productOldPriceInToman(product: Pick<Product, "price" | "regularPrice">): string {
  const { price, regularPrice } = product;
  if (
    !regularPrice
    || regularPrice.currencyCode !== price.currencyCode
    || regularPrice.minorUnit !== price.minorUnit
    || BigInt(regularPrice.amount) <= BigInt(price.amount)
  ) {
    return "";
  }

  return productPriceInToman(regularPrice);
}

/** Uses the product's warranty attribute, or a clear no-warranty value when none is supplied. */
export function productGuarantee(product: Pick<Product, "attributes">): string {
  const attribute = product.attributes.find(({ name }) => {
    const normalizedName = name.trim().toLocaleLowerCase("fa-IR");
    return normalizedName.includes("گارانتی")
      || normalizedName.includes("ضمانت")
      || normalizedName.includes("guarantee")
      || normalizedName.includes("warranty");
  });

  return attribute?.value || "بدون گارانتی";
}

export function productPath(slug: string): string {
  return `/product/${encodeURIComponent(slug)}`;
}

export function productUrl(slug: string, siteUrl: URL): string {
  return new URL(productPath(slug), siteUrl).toString();
}

export function productDescription(product: Pick<Product, "description" | "shortDescription">): string {
  return stripHtml(product.shortDescription || product.description);
}

export function productBreadcrumbJsonLd(product: Product, siteUrl: URL) {
  const category = product.categories[0];
  const items = [
    { name: "خانه", path: "/" },
    { name: "محصولات", path: "/products" },
    ...(category ? [{ name: category.name, path: `/products?category=${encodeURIComponent(category.slug)}` }] : []),
    { name: product.name, path: productPath(product.slug) },
  ];

  return {
    "@context": schemaOrg,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: new URL(item.path, siteUrl).toString(),
    })),
  };
}

/** Product / Offer markup used by Google's Product snippets and Merchant Listings. */
export function productJsonLd(product: Product, siteUrl: URL) {
  const url = productUrl(product.slug, siteUrl);
  const description = productDescription(product) || "خرید این محصول از فروشگاه کادوچی.";
  const category = product.categories[0];
  const hasAggregateRating = product.reviewCount > 0 && product.averageRating > 0;

  return {
    "@context": schemaOrg,
    "@type": "Product",
    name: product.name,
    description,
    url,
    ...(product.images.length ? { image: product.images.map((image) => image.url) } : {}),
    ...(category ? { category: category.name } : {}),
    ...(product.attributes.length
      ? {
          additionalProperty: product.attributes.map((attribute) => ({
            "@type": "PropertyValue",
            name: attribute.name,
            value: attribute.value,
          })),
        }
      : {}),
    offers: {
      "@type": "Offer",
      url,
      price: schemaPrice(product.price),
      priceCurrency: product.price.currencyCode,
      availability: `${schemaOrg}/${product.inStock && product.purchasable ? "InStock" : "OutOfStock"}`,
      itemCondition: `${schemaOrg}/NewCondition`,
      seller: {
        "@type": "Organization",
        name: "کادوچی",
        url: siteUrl.origin,
      },
    },
    ...(hasAggregateRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.averageRating,
            reviewCount: product.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

/** JSON-LD is inserted into a script element, so guard against a product name or description closing it. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    const escaped: Record<string, string> = {
      "<": "\\u003c",
      ">": "\\u003e",
      "&": "\\u0026",
      "\u2028": "\\u2028",
      "\u2029": "\\u2029",
    };
    return escaped[character];
  });
}
