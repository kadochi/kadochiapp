import "server-only";

import Redis from "ioredis";

let client: Redis | undefined;
let clientUrl: string | undefined;

/** A lazily connected Redis client for server-side, short-lived auth state. */
export function getRedis(url: string): Redis {
  if (client && clientUrl === url) return client;

  client?.disconnect();
  client = new Redis(url, {
    connectTimeout: 5_000,
    enableOfflineQueue: true,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  // Commands surface connection failures to their callers; this prevents an unhandled EventEmitter error.
  client.on("error", () => undefined);
  clientUrl = url;
  return client;
}
