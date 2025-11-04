// Client-safe helper to call our internal proxy (same-origin)
export async function proxyGetJSON<T>(
  path: string,
  init?: RequestInit & { revalidateSeconds?: number }
): Promise<T> {
  const clean = path.replace(/^\//, "");
  const url = `/api/wp/${clean}`;
  const { revalidateSeconds, ...rest } = init || {};
  const res = await fetch(`${url}${""}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(rest.headers || {}),
    },
    // Let Next cache this response if you want; by default proxy route is dynamic
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Proxy HTTP ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}
