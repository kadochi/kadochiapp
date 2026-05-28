import { getWpProxyBaseUrl } from "@/config/wp";

// Centralized security-related env reading
export const Security = {
  get wpBaseUrl() {
    return getWpProxyBaseUrl();
  },
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // Add more toggles if needed (rate limits, body size caps, etc.)
} as const;
