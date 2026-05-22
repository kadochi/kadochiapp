// Lightweight exponential backoff retry helper (no deps)
export interface RetryOptions {
  retries?: number; // total attempts including the first try
  factor?: number; // backoff multiplier
  minDelayMs?: number; // initial delay
  maxDelayMs?: number; // cap
  jitterRatio?: number; // add +/- jitter percentage
  shouldRetry?: (err: unknown, attempt: number) => boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  {
    retries = 3,
    factor = 2,
    minDelayMs = 250,
    maxDelayMs = 3000,
    jitterRatio = 0.2,
    shouldRetry = () => true,
  }: RetryOptions = {}
): Promise<T> {
  let attempt = 0;
  let delay = Math.max(0, minDelayMs);

  while (true) {
    attempt += 1;
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err, attempt)) throw err;
      const capped = Math.min(delay, maxDelayMs);
      const jitter = jitterRatio > 0 ? capped * jitterRatio * Math.random() : 0;
      await sleep(capped + jitter);
      delay *= factor;
    }
  }
}
