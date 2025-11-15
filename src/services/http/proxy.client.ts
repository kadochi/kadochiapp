// Client-safe helper to call our internal proxy (same-origin)
export async function proxyGetJSON<T>(
  path: string,
  init?: RequestInit & { revalidateSeconds?: number }
): Promise<T> {
  const clean = path.replace(/^\//, "");
  const url = `/api/wp/${clean}`;
  const { revalidateSeconds, ...rest } = init || {};
  const fetchInit: RequestInit & { next?: { revalidate?: number } } = {
    ...rest,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(rest.headers || {}),
    },
  };
  if (typeof revalidateSeconds === "number") {
    // Enable ISR/CDN caching
    fetchInit.cache = "force-cache";
    fetchInit.next = { ...(rest as any)?.next, revalidate: revalidateSeconds };
  } else {
    // Default: no-store to avoid caching when not explicitly requested
    fetchInit.cache = rest.cache ?? "no-store";
  }
  const res = await fetch(`${url}${""}`, fetchInit);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Proxy HTTP ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}
