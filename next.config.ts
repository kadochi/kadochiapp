/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
        pathname: "/avatar/**",
      },
      { protocol: "https", hostname: "app.kadochi.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
