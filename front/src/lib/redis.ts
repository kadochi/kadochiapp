import "server-only";
import Redis from "ioredis";

let client: Redis | null = null;

export function getRedis(): Redis {
  const url = (process.env.REDIS_URL || "").trim();
  if (!url) {
    throw new Error("REDIS_URL is not configured");
  }

  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }

  return client;
}
