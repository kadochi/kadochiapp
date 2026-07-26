import type { MetadataRoute } from "next";

import { env } from "@/lib/server/env";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = new URL(env.KADOCHI_FRONTEND_URL);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/wp-admin/",
        "/wp-json/",
        "/wp-login.php",
        "/xmlrpc.php",
        "/basket",
        "/checkout",
        "/login",
        "/occasions",
        "/preview",
        "/profile/",
      ],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
