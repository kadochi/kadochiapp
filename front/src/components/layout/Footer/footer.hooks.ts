"use client";

/**
 * Footer hooks — route-based hide check and category fetching.
 * Extracted from Footer.tsx (no behavior change).
 */

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { HIDDEN_ROUTES, type StoreCategory } from "./footer.constants";

export function useHideFooter() {
  const pathname = usePathname();
  return useMemo(
    () =>
      HIDDEN_ROUTES.some((pattern) =>
        typeof pattern === "string"
          ? pathname === pattern
          : pattern.test(pathname),
      ),
    [pathname],
  );
}

export function useFooterCategories(hide: boolean) {
  const [categories, setCategories] = useState<StoreCategory[] | null>(null);

  useEffect(() => {
    if (hide) return;
    let cancelled = false;

    // Fetch via same-origin proxy to avoid CORS
    const url = `/api/store/categories?per_page=100&hide_empty=true`;

    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: StoreCategory[]) => {
        if (cancelled) return;
        const filtered = (data || []).filter((c) => {
          const n = (c?.name || "").trim().toLowerCase();
          const s = (c?.slug || "").trim().toLowerCase();
          return n !== "بدون دسته‌بندی" && s !== "uncategorized";
        });
        setCategories(filtered.slice(0, 100));
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, [hide]);

  return categories;
}
