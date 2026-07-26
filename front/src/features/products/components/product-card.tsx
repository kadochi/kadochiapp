import Link from "next/link";
import Image from "next/image";

import { Price } from "@/components/layout/price";
import { cn } from "@/lib/utils";
import { usePrice } from "../hooks/usePrice";
import type { Product } from "../types";

type ProductCardProps = {
  product: Product;
  href?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

/** Displays a product's image, name, and price in the catalog grid. */
export function ProductCard({
  product,
  href,
  priority = false,
  sizes = "(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 50vw",
  className,
}: ProductCardProps) {
  const { current, previous, offPercent } = usePrice(product);
  const image = product.images[0];
  const showPrice = product.inStock;

  return (
    <Link
      className={cn(
        "block w-full no-underline text-inherit [direction:rtl]",
        "[content-visibility:auto] [contain-intrinsic-size:auto_322px]",
        className,
      )}
      href={href ?? `/product/${product.slug}`}
      prefetch={false}
    >
      <div className="relative grid aspect-[1/1.2] w-full place-items-center overflow-hidden rounded-[var(--radius-l)]">
        {image ? (
          <Image
            alt={image.alt || product.name}
            className="absolute inset-0 size-full object-cover"
            fetchPriority={priority ? "high" : "auto"}
            fill
            loading={priority ? undefined : "lazy"}
            preload={priority}
            quality={55}
            sizes={sizes}
            src={image.url}
          />
        ) : null}
      </div>

      <div className="min-h-[104px] p-16 text-center">
        <div
          className="mb-8 line-clamp-2 h-[calc(var(--text-label-14--line-height)*2)] font-sans text-label-14 font-bold leading-[var(--text-label-14--line-height)] text-surface-neutral-high-emphasis"
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
