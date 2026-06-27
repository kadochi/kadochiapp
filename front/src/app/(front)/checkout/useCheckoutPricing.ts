"use client";

/**
 * useCheckoutPricing
 * -----------------------------------------------------------------------------
 * Fetches Store-API product prices for the current basket so the payment step
 * only renders after totals are resolved, plus a best-effort "fast delivery"
 * tag check. Extracted verbatim from CheckoutClient (no behavior change).
 *
 * NOTE: this stays a plain hook for now; it becomes a TanStack Query hook in
 * the data-layer phase.
 */

import { useEffect, useState } from "react";
import { fetchProductsByIds, type ViewProduct } from "./checkout.helpers";

export function useCheckoutPricing(basketIds: string[]) {
  const [items, setItems] = useState<ViewProduct[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingReady, setPricingReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      if (!basketIds.length) {
        // Empty basket → nothing to price; keep behavior but mark as "ready".
        if (!cancelled) {
          setItems([]);
          setPricingLoading(false);
          setPricingReady(true);
        }
        return;
      }

      if (!cancelled) {
        setPricingLoading(true);
        setPricingReady(false);
      }

      try {
        const arr = await fetchProductsByIds(basketIds, ac.signal);
        if (cancelled) return;

        const idSet = new Set(basketIds.map(String));
        const mapped: ViewProduct[] = (arr || [])
          .filter((p) => idSet.has(String(p?.id)))
          .map((p) => ({ id: p.id, prices: p.prices }));

        setItems(mapped);
      } finally {
        // Even on error we mark as "ready", so behavior stays compatible
        // with previous logic (totals may be 0, but the flow is not blocked).
        if (!cancelled) {
          setPricingLoading(false);
          setPricingReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basketIds.join(",")]);

  return { items, pricingLoading, pricingReady };
}

export function useFastDelivery(basketIds: string[]) {
  const [allFast, setAllFast] = useState(false);

  // Best-effort "fast-delivery" tag check via Store API.
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      if (!basketIds.length) {
        if (!cancelled) setAllFast(false);
        return;
      }
      try {
        const arr = await fetchProductsByIds(basketIds, ac.signal);
        if (cancelled) return;

        const FAST_SET = new Set(
          [
            "fast",
            "fast-deliver",
            "fast-delivery",
            "ارسال سریع",
            "ارسال-سریع",
          ].map((s) => s.toLowerCase().trim()),
        );

        const ok =
          Array.isArray(arr) &&
          arr.length === basketIds.length &&
          arr.every((p) => {
            const tags = Array.isArray(p?.tags) ? p.tags : [];
            return tags.some((t) => {
              const slug = String(t?.slug ?? "")
                .toLowerCase()
                .trim();
              const name = String(t?.name ?? "")
                .toLowerCase()
                .trim();
              return FAST_SET.has(slug) || FAST_SET.has(name);
            });
          });

        if (!cancelled) setAllFast(!!ok);
      } catch {
        if (!cancelled) setAllFast(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basketIds.join(",")]);

  return allFast;
}
