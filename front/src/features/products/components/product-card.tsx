import Link from "next/link";
import Image from "next/image";

import { Price } from "@/components/layout/price";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePrice } from "../hooks/usePrice";
import type { Product } from "../types";
import { deliveryBadge } from "../utils/preparation-time";
import { ProductCardImage } from "./product-card-image";

type ProductCardProps = {
  product: Product;
  href?: string;
  priority?: boolean;
  /** Load images already in the user's initial or adjacent viewport without preloading them. */
  eagerImage?: boolean;
  sizes?: string;
  className?: string;
  /** Displays an image placeholder while a carousel slide's image is loading. */
  imageLoadingPlaceholder?: boolean;
};

/** Displays a product's image, name, and price in the catalog grid. */
export function ProductCard({
  product,
  href,
  priority = false,
  eagerImage = false,
  sizes = "(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 50vw",
  className,
  imageLoadingPlaceholder = false,
}: ProductCardProps) {
  const { current, previous, offPercent } = usePrice(product);
  const image = product.images[0];
  const showPrice = product.inStock;
  const badge = deliveryBadge(product.preparationHours);
  const showDeliveryBadge = badge.usesFastDeliveryIcon;

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
          imageLoadingPlaceholder ? (
            <ProductCardImage
              alt={image.alt || product.name}
              image={image}
              key={image.url}
              eager={eagerImage}
              priority={priority}
              sizes={sizes}
            />
          ) : (
            <Image
              alt={image.alt || product.name}
              className="absolute inset-0 size-full object-cover"
              fetchPriority={priority ? "high" : "auto"}
              fill
              loading={priority || eagerImage ? "eager" : "lazy"}
              preload={priority}
              quality={55}
              sizes={sizes}
              src={image.url}
            />
          )
        ) : null}
        {showDeliveryBadge ? (
          <Label
            appearance={product.preparationHours <= 3 ? "gradient" : "soft"}
            className="absolute top-8 right-8"
            leadingIcon={product.preparationHours <= 3
              ? <Image alt="" height={14} src="/icons/fast-delivery.svg" width={14} />
              : <span className="block size-[var(--label-icon-size)] bg-current [-webkit-mask-image:url('/icons/fast-delivery.svg')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] [mask-image:url('/icons/fast-delivery.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]" />}
            size="sm"
            variant="success"
          >
            {badge.label}
          </Label>
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
