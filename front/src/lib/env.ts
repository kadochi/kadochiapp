const env = typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>);

export function getEnv(name: string, fallback?: string): string {
  const val = env[name] ?? fallback;
  if (!val) throw new Error(`Missing required env: ${name}`);
  return val;
}

export function getEnvOrNull(name: string): string | null {
  return env[name] ?? null;
}
