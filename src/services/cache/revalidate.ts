// Helpers for choosing sensible ISR windows in one place
export const Revalidate = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 60 * 60, // 1 hour
  DAILY: 60 * 60 * 24,
} as const;
