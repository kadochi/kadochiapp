import Link from "next/link";

import { Price } from "@/components/layout/price";
import { cn } from "@/lib/utils";
import { usePrice } from "../hooks/usePrice";
import type { Product } from "../types";

type ProductCardProps = {
  product: Product;
  href?: string;
  priority?: boolean;
  className?: string;
};

/** Displays a product's image, name, and price in the catalog grid. */
export function ProductCard({
  product,
  href,
  priority = false,
  className,
}: ProductCardProps) {
  const { current, previous, offPercent } = usePrice(product);
  const image = product.images[0];
  const showPrice = product.inStock;

  return (
    <Link
      className={cn(
        "block w-full no-underline text-inherit [direction:rtl]",
        className,
      )}
      href={href ?? `/product/${product.slug}`}
    >
      <div className="relative grid aspect-[1/1.2] w-full place-items-center overflow-hidden rounded-l bg-surface">
        {image ? (
          <img
            alt={image.alt || product.name}
            className="absolute inset-0 size-full object-cover"
            fetchPriority={priority ? "high" : "auto"}
            loading={priority ? "eager" : "lazy"}
            src={image.url}
          />
        ) : null}
      </div>

      <div className="pt-8 pb-16 px-16 text-center">
        <div
          className="mb-12 line-clamp-2 h-[calc(var(--text-label-14--line-height)*2)] font-sans text-label-14 font-bold leading-[var(--text-label-14--line-height)] text-surface-neutral-high-emphasis"
          title={product.name}
        >
          {product.name}
        </div>

        <div className="inline-flex items-baseline justify-center">
          {showPrice ? (
            <Price
              current={current}
              offPercent={offPercent}
              previous={previous}
            />
          ) : (
            <span className="text-label-14 text-surface-neutral-low-emphasis">
              ناموجود
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
