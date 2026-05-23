// Centralized security-related env reading
export const Security = {
  wpBaseUrl:
    process.env.WP_BASE_URL || process.env.NEXT_PUBLIC_WP_BASE_URL || "",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // Add more toggles if needed (rate limits, body size caps, etc.)
} as const;
