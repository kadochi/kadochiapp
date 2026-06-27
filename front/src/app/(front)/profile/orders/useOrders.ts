"use client";

/**
 * useOrders — paginated orders fetching with focus/visibility refresh and
 * infinite-scroll observer. Extracted from OrdersPageClient (no behavior change).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeOrders, PER_PAGE, type Order } from "./orders.helpers";

export function useOrders(initialOrders: Order[]) {
  const [orders, setOrders] = useState<Order[]>(() =>
    normalizeOrders(initialOrders),
  );
  const [page, setPage] = useState(orders.length > 0 ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [hasMore, setHasMore] = useState<boolean>(true);

  const lastReqId = useRef(0);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(async (nextPage: number) => {
    const reqId = ++lastReqId.current;
    setLoading(true);
    setErr("");

    const ctl = new AbortController();

    try {
      const r = await fetch(
        `/api/orders?page=${nextPage}&per_page=${PER_PAGE}`,
        {
          cache: "no-store",
          credentials: "same-origin",
          signal: ctl.signal,
        },
      );
      if (!r.ok) throw new Error(String(r.status));
      const data = await r.json().catch(() => ({ items: [] }));
      if (reqId !== lastReqId.current) return;

      const newItems = normalizeOrders(data);
      setOrders((prev) => (nextPage === 1 ? newItems : [...prev, ...newItems]));
      setPage(nextPage);
      setHasMore(Array.isArray(newItems) && newItems.length === PER_PAGE);
    } catch {
      if (reqId === lastReqId.current) setErr("خطا در بارگذاری سفارش‌ها");
    } finally {
      if (reqId === lastReqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  useEffect(() => {
    const onFocus = () => {
      fetchPage(1);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchPage]);

  const onRetry = () => fetchPage(1);

  const onLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPage((page || 1) + 1);
    }
  }, [loading, hasMore, fetchPage, page]);

  useEffect(() => {
    if (!hasMore) return;
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: "0px 0px 200px 0px",
        threshold: 0.1,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return { orders, loading, err, hasMore, loaderRef, onRetry };
}
