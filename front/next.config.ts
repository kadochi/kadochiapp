import type { NextConfig } from "next";

const configuredWordPressUrl =
  process.env.NEXT_PUBLIC_WORDPRESS_URL ?? "http://localhost:8080";

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
    loader: "custom",
    loaderFile: "./src/lib/wordpress-image-loader.ts",
    formats: ["image/avif", "image/webp"],
    qualities: [55, 60, 75],
    remotePatterns: [
      wordpressMediaPattern(configuredWordPressUrl),
      // Keep the local WordPress origin available even if an environment
      // variable points the application at a remote API.
      wordpressMediaPattern("http://localhost:8080"),
      wordpressMediaPattern("https://api.kadochi.com"),
    ],
  },
  turbopack: {
    // The repository has a second lockfile at its root. Without this explicit
    // boundary, Turbopack can calculate incompatible client-reference paths.
    root: __dirname,
  },
};

export default nextConfig;
