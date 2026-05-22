// src/config/index.ts
export function getConfig() {
  return {
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || "",
    CSRF_SECRET: process.env.CSRF_SECRET || "dev-secret",
    KADOCHI_JWT_SECRET: process.env.KADOCHI_JWT_SECRET || "dev-jwt-secret",
  };
}
