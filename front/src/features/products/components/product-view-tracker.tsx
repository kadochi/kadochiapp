"use client";

import { useEffect } from "react";

export function ProductViewTracker({ productId }: Readonly<{ productId: number }>) {
  useEffect(() => {
    // This telemetry is intentionally outside the page-load measurement
    // window; it has no bearing on the product experience and must never
    // compete with the gallery's LCP image.
    const timer = window.setTimeout(() => {
      void fetch(`/api/products/${productId}/views`, {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => undefined);
    }, 15_000);

    return () => window.clearTimeout(timer);
  }, [productId]);

  return null;
}
