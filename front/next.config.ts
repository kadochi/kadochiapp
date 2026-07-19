import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // The repository has a second lockfile at its root. Without this explicit
    // boundary, Turbopack can calculate incompatible client-reference paths.
    root: __dirname,
  },
};

export default nextConfig;
