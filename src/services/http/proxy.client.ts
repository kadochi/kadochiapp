// src/services/http/proxy.client.ts

type ProxyInit = RequestInit & {
  revalidateSeconds?: number;
  next?: { revalidate?: number | false };
};

export async function proxyGetJSON<T>(
  path: string,
  init?: ProxyInit
): Promise<T> {
  const clean = path.replace(/^\//, "");
  const url = `/api/wp/${clean}`;

  const { revalidateSeconds, next, ...rest } = init || {};

  const fetchInit: RequestInit & { next?: { revalidate?: number } } = {
    ...rest,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(rest.headers || {}),
    },
  };

  if (typeof revalidateSeconds === "number") {
    fetchInit.cache = "force-cache";
    fetchInit.next = {
      ...(typeof next?.revalidate === "number"
        ? { revalidate: next.revalidate }
        : {}),
      revalidate: revalidateSeconds,
    };
  } else {
    fetchInit.cache = rest.cache ?? "no-store";
  }

  const res = await fetch(url, fetchInit);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Proxy HTTP ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}
