import type { NextConfig } from "next";

const configuredWordPressUrl =
  process.env.NEXT_PUBLIC_WORDPRESS_URL ?? "http://localhost:8080";
const isDevelopment = process.env.NODE_ENV === "development";

function wordpressMediaPattern(value: string) {
  const url = new URL(value);
  return {
    protocol: url.protocol.replace(":", "") as "http" | "https",
    hostname: url.hostname,
    port: url.port,
    pathname: "/wp-content/uploads/**",
  };
}

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Storefront CSS is small enough to inline, avoiding several render-
    // blocking round trips on mobile without changing cascade or behavior.
    inlineCss: true,
  },
  images: {
    // The built-in optimizer owns bounded fetching, transformation, and cache
    // lifecycle. Production config resolves this to api.kadochi.com; local
    // development may explicitly configure its local public WordPress origin.
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    formats: ["image/avif", "image/webp"],
    // Docker's WordPress service has a private network address. This is only
    // enabled for local development, where image sources are translated to the
    // service hostname below; production continues to use the public origin.
    dangerouslyAllowLocalIP: isDevelopment,
    minimumCacheTTL: 86_400,
    qualities: [55, 60, 75],
    remotePatterns: [
      wordpressMediaPattern(configuredWordPressUrl),
      ...(isDevelopment ? [wordpressMediaPattern(process.env.WORDPRESS_INTERNAL_URL ?? "http://wordpress")] : []),
    ],
  },
  turbopack: {
    // The repository has a second lockfile at its root. Without this explicit
    // boundary, Turbopack can calculate incompatible client-reference paths.
    root: __dirname,
  },
};

export default nextConfig;
