"use client";

import { Price } from "@/components/layout/price";
import { Button } from "@/components/ui/button";
import { InputStepper } from "@/components/ui/input-stepper";
import { useAddToCart } from "../hooks/useAddToCart";
import { usePrice } from "../hooks/usePrice";
import type { Product } from "../types";

export type ProductActionBarProps = {
  product: Product;
};

/** Sticky bottom bar with the current price and the add-to-cart control. */
export function ProductActionBar({ product }: Readonly<ProductActionBarProps>) {
  const { current, previous, offPercent } = usePrice(product);
  const { quantity, isInCart, setQuantity, add, remove, isPending } = useAddToCart({ productId: product.id });

  return (
    <div className="sticky inset-x-0 bottom-0 z-40 border-t border-border-low-emphasis bg-surface-background px-16 pt-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))]">
      <div className="mx-auto grid max-w-[580px] grid-cols-2 items-center gap-8">
        <Price current={current} previous={previous} offPercent={offPercent} size="L" orientation="vertical" showArrowOnLargeH />
        <div className="flex items-center justify-end gap-8">
          {product.inStock ? (
            isInCart ? (
              <InputStepper
                disabled={isPending}
                min={1}
                max={9}
                onRemove={remove}
                onValueChange={setQuantity}
                size="sm"
                value={quantity}
                variant="outline"
              />
            ) : (
              <Button variant="primary-filled" size="large" loading={isPending} onClick={add} className="flex-1">
                افزودن به سبد خرید
              </Button>
            )
          ) : (
            <span className="inline-flex w-full items-center justify-center px-16 py-12 text-label-14 font-regular leading-[var(--text-label-14--line-height)] text-surface-neutral-low-emphasis">
              ناموجود
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
