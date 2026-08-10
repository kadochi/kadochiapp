import { ProductCard } from "./product-card";
import type { Product } from "../types";

export type ProductListProps = {
  items: readonly Product[];
};

/** Renders supplied products in the responsive catalog grid. */
export function ProductList({ items }: Readonly<ProductListProps>) {
  return (
    <section
      aria-label="شبکه محصولات"
      className="grid grid-cols-2 gap-16 px-16 pb-24 pt-8 min-[640px]:grid-cols-4 min-[1024px]:grid-cols-6 min-[1024px]:gap-20"
    >
      {items.map((product, index) => (
        <ProductCard
          eagerImage={index < 4}
          imageLoadingPlaceholder
          key={product.id}
          priority={index === 0}
          product={product}
        />
      ))}
    </section>
  );
}
