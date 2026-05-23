/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
        pathname: "/avatar/**",
      },
      // Production WordPress (public domain served by Traefik)
      { protocol: "https", hostname: "api.kadochi.com", pathname: "/**" },
      // Legacy production domain — keep until fully migrated
      { protocol: "https", hostname: "app.kadochi.com", pathname: "/**" },
      // Local development: Next.js running on host, WordPress at localhost:8080
      { protocol: "http", hostname: "localhost", port: "8080", pathname: "/**" },
    ],
  },
};

export default nextConfig;
