import type { MetadataRoute } from "next";

import { listCategories, listProducts, listProductTags } from "@/features/products/services/products.server";
import { productPath } from "@/features/products/utils/product-seo";
import { env } from "@/lib/server/env";

export const revalidate = 3600;

const staticPaths = ["/", "/products", "/gift-finder", "/about", "/contact", "/faq", "/shipping", "/terms", "/privacy", "/magazine"];

/** Lists every browseable product URL so Search Console can discover canonical PDPs directly. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = new URL(env.KADOCHI_FRONTEND_URL);
  let products: Awaited<ReturnType<typeof listProducts>>["items"] = [];
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let tags: Awaited<ReturnType<typeof listProductTags>> = [];

  try {
    const firstPage = await listProducts({ page: 1, perPage: 50 });
    // The catalog API intentionally bounds page numbers at 100. If the
    // catalog grows beyond 5,000 items, split this into sitemap index routes
    // rather than allowing one invalid request to empty the PDP sitemap.
    const totalPages = Math.min(firstPage.totalPages, 100);
    const rest = await Promise.all(
      Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) =>
        listProducts({ page: index + 2, perPage: 50 }),
      ),
    );
    products = [firstPage, ...rest].flatMap((page) => page.items);
  } catch {
    // Preserve a valid sitemap for the static catalog entry points during an
    // upstream outage; the next revalidation will add PDP URLs again.
  }

  try {
    [categories, tags] = await Promise.all([
      listCategories({ perPage: 100, hideEmpty: true }),
      listProductTags(),
    ]);
  } catch {
    // Taxonomy URLs are additive. Keep product and static entries available
    // when one of the Store API taxonomy endpoints is temporarily unavailable.
  }

  return [
    ...staticPaths.map((path) => ({ url: new URL(path, siteUrl).toString(), changeFrequency: "weekly" as const, priority: path === "/" ? 1 : 0.7 })),
    ...categories.map((category) => ({
      url: new URL(`/products?category=${encodeURIComponent(category.slug)}`, siteUrl).toString(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...tags.map((tag) => ({
      url: new URL(`/products?tag=${encodeURIComponent(tag.slug)}`, siteUrl).toString(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...products.map((product) => ({
      url: new URL(productPath(product.slug), siteUrl).toString(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
