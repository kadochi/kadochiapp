// Lightweight exponential backoff retry helper (no deps)
export interface RetryOptions {
  retries?: number; // total attempts including the first try
  factor?: number; // backoff multiplier
  minDelayMs?: number; // initial delay
  maxDelayMs?: number; // cap
  shouldRetry?: (err: unknown) => boolean;
}

export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  {
    retries = 3,
    factor = 2,
    minDelayMs = 250,
    maxDelayMs = 3000,
    shouldRetry = () => true,
  }: RetryOptions = {}
): Promise<T> {
  let attempt = 0;
  let delay = minDelayMs;
  // We consider the first execution as attempt #1
  while (true) {
    attempt += 1;
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) throw err;
      await new Promise((r) => setTimeout(r, Math.min(delay, maxDelayMs)));
      delay *= factor;
    }
  }
}
