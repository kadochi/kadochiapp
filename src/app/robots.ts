// src/app/robots.ts
import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://kadochi.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/api/*",
          "/basket",
          "/basket/*",
          "/checkout",
          "/checkout/*",
          "/pay",
          "/pay/*",
          "/zp-callback",
          "/profile",
          "/profile/*",
          "/wp-admin",
          "/wp-login.php",
          "/wp-json/",
          "/_next/",
          "/static/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
