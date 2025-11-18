// src/app/sitemap.ts
import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://kadochi.com";

type WooProduct = {
  id: number;
  date_modified?: string;
  date_created?: string;
};

async function getPublishedProducts(): Promise<WooProduct[]> {
  try {
    const base = process.env.WOO_BASE_URL || process.env.WP_BASE_URL;
    const key = process.env.WOO_CONSUMER_KEY;
    const secret = process.env.WOO_CONSUMER_SECRET;

    if (!base || !key || !secret) {
      return [];
    }

    const url = new URL("/wp-json/wc/v3/products", base);
    url.searchParams.set("status", "publish");
    url.searchParams.set("per_page", "100");

    const auth = Buffer.from(`${key}:${secret}`).toString("base64");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to fetch products for sitemap:", res.statusText);
      return [];
    }

    const data = (await res.json()) as WooProduct[];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error while building product sitemap:", err);
    return [];
  }
}

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

  const products = await getPublishedProducts();

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
