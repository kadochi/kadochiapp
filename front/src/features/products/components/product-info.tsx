import { Clock, MessageSquare, Star } from "lucide-react";
import Image from "next/image";

import { Price } from "@/components/layout/price";
import { Label } from "@/components/ui/label";
import { usePrice } from "../hooks/usePrice";
import type { Product } from "../types";
import { deliveryBadge } from "../utils/preparation-time";

export type ProductInfoProps = {
  product: Product;
};

/** Title, price, and metadata chips for the product detail page. */
export function ProductInfo({ product }: Readonly<ProductInfoProps>) {
  const { current, previous, offPercent } = usePrice(product);
  const badge = deliveryBadge(product.preparationHours);

  return (
    <section className="px-16 pt-24 pb-16 text-center [direction:rtl]" aria-labelledby="pdp-title">
      <h1
        id="pdp-title"
        className="m-0 mb-12 font-sans text-title-18 font-bold leading-[var(--text-title-18--line-height)] text-surface-neutral-high-emphasis"
      >
        {product.name}
      </h1>

      <div className="mb-16 inline-flex items-baseline justify-center" aria-label="قیمت">
        {product.inStock ? (
          <Price current={current} offPercent={offPercent} orientation="horizontal" previous={previous} showArrowOnLargeH size="L" />
        ) : (
          <span className="text-label-14 text-surface-neutral-low-emphasis">ناموجود</span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-8">
        <Label
          appearance={badge.usesFastDeliveryIcon ? "gradient" : "soft"}
          leadingIcon={badge.usesFastDeliveryIcon ? <Image alt="" height={14} src="/icons/fast-delivery.svg" width={14} /> : <Clock />}
          size="sm"
          variant="success"
        >
          {badge.label}
        </Label>
        <Label appearance="soft" leadingIcon={<MessageSquare />} size="sm" variant="neutral">
          {product.reviewCount.toLocaleString("fa-IR")} نظر
        </Label>
        {product.reviewCount > 0 ? (
          <Label appearance="soft" leadingIcon={<Star />} size="sm" variant="neutral">
            امتیاز {product.averageRating.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}
          </Label>
        ) : null}
      </div>
    </section>
  );
}
