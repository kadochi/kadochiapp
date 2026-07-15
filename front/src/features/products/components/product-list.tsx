"use client";

import { ProductCard } from "./product-card";
import { useProductList } from "../hooks/useProductList";
import type { Product } from "../types";

export type ProductListProps = {
  items: readonly Product[];
};

/** Renders supplied products in the responsive catalog grid. */
export function ProductList({ items }: Readonly<ProductListProps>) {
  const products = useProductList(items);

  return (
    <section
      aria-label="شبکه محصولات"
      className="grid grid-cols-2 gap-16 px-16 pb-24 pt-8 min-[640px]:grid-cols-4 min-[1024px]:grid-cols-6 min-[1024px]:gap-20"
    >
      {products.map(({ product, priority }) => (
        <ProductCard key={product.id} priority={priority} product={product} />
      ))}
    </section>
  );
}
