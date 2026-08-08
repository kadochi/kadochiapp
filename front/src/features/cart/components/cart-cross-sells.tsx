"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

import { NormalPrice } from "@/components/layout/price";
import SectionHeader from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import type { Product } from "@/features/products/types";
import type { Cart } from "../types";
import { tomanAmount } from "../utils/money";

type CartCrossSellsProps = {
  products: readonly Product[];
  cartItems: Cart["items"];
  pendingItems: ReadonlySet<string>;
  onAdd: (productId: number) => void;
  onRemove: (itemKey: string) => void;
};

/** A bottom-aligned rail for short carts that flows after long cart lists. */
export function CartCrossSells({ products, cartItems, pendingItems, onAdd, onRemove }: Readonly<CartCrossSellsProps>) {
  if (!products.length) return null;

  return (
    <section aria-label="پیشنهادهای تکمیل هدیه" className="-mx-16 mt-24 pb-16 lg:mx-0 lg:mt-0" dir="rtl">
      <Divider size="md" variant="spacer" />
      <SectionHeader
        as="h2"
        subtitle="محصولات پیشنهادی برای تکمیل هدیه"
        title="چیزی از قلم نیافتاده؟"
      />

      <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full snap-x snap-mandatory px-16">
          {products.map((product) => {
            const selectedItem = cartItems.find((item) => item.isCrossSell && item.productId === product.id);
            const pending = pendingItems.has(`cross-sell:${product.id}`) || (selectedItem ? pendingItems.has(selectedItem.key) : false);
            const controlClassName = selectedItem
              ? "border-error text-error"
              : "border-surface-neutral-high-emphasis text-surface-neutral-high-emphasis";

            return (
              <article className="w-[calc((100vw-40px)/2.5)] min-w-[144px] max-w-[220px] shrink-0 snap-start px-4 text-center" key={product.id}>
                <div className="relative aspect-[1/1.1] overflow-hidden rounded-[var(--radius-l)] bg-surface-background">
                  <Link aria-label={product.name} className="absolute inset-0" href={`/product/${product.slug}`} prefetch={false}>
                    {product.images[0] ? (
                      <Image
                        alt={product.images[0].alt || product.name}
                        className="object-cover"
                        fill
                        sizes="(min-width: 580px) 220px, 40vw"
                        src={product.images[0].url}
                      />
                    ) : null}
                  </Link>
                  <Button
                    aria-label={selectedItem ? `حذف ${product.name} از سبد خرید` : `افزودن ${product.name} به سبد خرید`}
                    className={`absolute bottom-8 right-8 z-10 size-48 rounded-full bg-surface-background p-0 shadow-sm ${controlClassName}`}
                    disabled={pending}
                    loading={pending}
                    size="medium"
                    variant="tertiary-outline"
                    onClick={() => selectedItem ? onRemove(selectedItem.key) : onAdd(product.id)}
                  >
                    {selectedItem ? <Trash2 aria-hidden="true" className="size-24" /> : <Plus aria-hidden="true" className="size-28" />}
                  </Button>
                </div>
                <Link className="block no-underline" href={`/product/${product.slug}`} prefetch={false}>
                  <h3 className="m-0 mt-16 line-clamp-2 min-h-[calc(var(--text-title-14--line-height)*2)] text-title-14 font-bold leading-[var(--text-title-14--line-height)] text-surface-neutral-high-emphasis">
                    {product.name}
                  </h3>
                  <div className="mt-8"><NormalPrice amount={tomanAmount(product.price)} size="M" /></div>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
