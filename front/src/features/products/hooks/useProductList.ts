import { useMemo } from "react";

import type { Product } from "../types";

export type ProductListItem = {
  product: Product;
  priority: boolean;
};

/** Prepares products for display in a catalog grid without changing their order. */
export function useProductList(items: readonly Product[]): ProductListItem[] {
  return useMemo(
    () => items.map((product, index) => ({ product, priority: index === 0 })),
    [items],
  );
}
