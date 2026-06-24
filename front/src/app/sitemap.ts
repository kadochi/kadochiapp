import type { MetadataRoute } from "next";
import { getPublishedProductsForSitemap } from "@/modules/catalog";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://kadochi.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/products",
    "/occasions",
    "/about",
    "/contact",
    "/faq",
    "/privacy",
    "/shipping",
    "/terms",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1.0 : 0.7,
  }));

  const products = await getPublishedProductsForSitemap();

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => {
    const lastModified =
      product.date_modified || product.date_created || now.toISOString();

    return {
      url: `${SITE_URL}/product/${product.id}`,
      lastModified: new Date(lastModified),
      changeFrequency: "daily",
      priority: 0.8,
    };
  });

  return [...staticRoutes, ...productRoutes];
}
