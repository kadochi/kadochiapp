"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import type { WordPressJsonOptions } from "./index";

interface UseWordPressFetchState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  etag: string | null;
}

export interface UseWordPressFetchOptions<T> extends WordPressJsonOptions<T> {
  /** Disable the hook without tearing down previous data. */
  enabled?: boolean;
}

const DEFAULT_STATE: UseWordPressFetchState<unknown> = {
  data: null,
  error: null,
  loading: false,
  etag: null,
};

function parseClientSchema<T>(
  raw: unknown,
  options: UseWordPressFetchOptions<T>
): T {
  if (options.schema) {
    if (typeof options.schema === "function") {
      return options.schema(raw);
    }
    return options.schema.parse(raw);
  }
  if (options.transform) {
    return options.transform(raw);
  }
  return raw as T;
}

export function useWordPressFetch<T = unknown>(
  path: string,
  { enabled = true, ...options }: UseWordPressFetchOptions<T> = {}
) {
  const [state, setState] = useState<UseWordPressFetchState<T>>({
    ...DEFAULT_STATE,
  });
  const abortRef = useRef<AbortController | null>(null);
  const key = useMemo(() => `${path}:${options.ifNoneMatch ?? ""}`, [
    path,
    options.ifNoneMatch,
  ]);

  useEffect(() => {
    if (!enabled) return () => abortRef.current?.abort();

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

      startTransition(() => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
      });

    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/json");
    if (options.ifNoneMatch) headers.set("If-None-Match", options.ifNoneMatch);

    const url = `/api/wp${path.startsWith("/") ? path : `/${path}`}`;

    fetch(url, {
      method: options.method || "GET",
      headers,
      cache: "no-store",
      signal: controller.signal,
      body: options.body,
    })
        .then(async (res) => {
          if (!res.ok) throw new Error(`WordPress request failed (${res.status})`);
          if (res.status === 204) {
            return { data: null, etag: res.headers.get("etag") };
          }
          const json = await res.json();
          const next = parseClientSchema(json, options);
          return { data: next, etag: res.headers.get("etag") };
        })
        .then(({ data, etag }) => {
          setState({ data, error: null, loading: false, etag });
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (err instanceof Error) {
            setState({ data: null, error: err, loading: false, etag: null });
            return;
          }
          setState({
            data: null,
            error: new Error(String(err)),
            loading: false,
            etag: null,
          });
        });

    return () => {
      controller.abort();
    };
  }, [
    key,
    enabled,
    options.body,
    options.method,
    options.schema,
    options.transform,
    options.headers,
  ]);

  return state;
}
