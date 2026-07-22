"use client";

import { useEffect } from "react";

export function ProductViewTracker({ productId }: Readonly<{ productId: number }>) {
  useEffect(() => {
    void fetch(`/api/products/${productId}/views`, { method: "POST", credentials: "same-origin", keepalive: true });
  }, [productId]);

  return null;
}
