"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { InputStepper } from "@/components/ui/input-stepper";
import { NormalPrice, SumPrice } from "@/components/layout/price";
import StateMessage from "@/components/layout/state-message";
import { tomanAmount } from "../utils/money";
import { useCart } from "../hooks/use-cart";
import { getCartCrossSells } from "../services/cart";
import type { Cart } from "../types";
import type { Product } from "@/features/products/types";
import { CartCrossSells } from "./cart-cross-sells";

export function BasketPage({ initialCart, initialCrossSells = [], loadError }: { initialCart: Cart | null; initialCrossSells?: readonly Product[]; loadError?: string }) {
  const { cart, error, pendingItems, changeQuantity, remove, addCrossSell, dismissError } = useCart(initialCart);
  const [crossSells, setCrossSells] = useState<readonly Product[]>(initialCrossSells);
  const [isDesktopRailFixed, setIsDesktopRailFixed] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const cartLinesRef = useRef<HTMLDivElement>(null);
  const crossSellsRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const sourceKey = useMemo(() => cartSourceKey(cart), [cart]);
  const previousSourceKey = useRef(sourceKey);

  useEffect(() => {
    if (sourceKey === previousSourceKey.current) return;
    previousSourceKey.current = sourceKey;
    let active = true;
    getCartCrossSells().then((products) => {
      if (active) setCrossSells(products);
    }).catch(() => {
      // The current suggestions remain useful if their background refresh fails.
    });
    return () => { active = false; };
  }, [sourceKey]);

  useLayoutEffect(() => {
    const updateRailPosition = () => {
      const page = pageRef.current;
      const cartLines = cartLinesRef.current;
      const rail = crossSellsRef.current;
      const summary = summaryRef.current;
      if (!page || !cartLines || !rail || !summary) return;

      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      const requiredHeight = page.getBoundingClientRect().top
        + cartLines.getBoundingClientRect().height
        + rail.getBoundingClientRect().height
        + 24
        + summary.getBoundingClientRect().height;
      setIsDesktopRailFixed(desktop && requiredHeight <= window.innerHeight);
    };

    updateRailPosition();
    window.addEventListener("resize", updateRailPosition);
    if (!("ResizeObserver" in window)) {
      return () => window.removeEventListener("resize", updateRailPosition);
    }
    const observer = new ResizeObserver(updateRailPosition);
    [cartLinesRef.current, crossSellsRef.current, summaryRef.current].forEach((element) => {
      if (element) observer.observe(element);
    });
    return () => {
      window.removeEventListener("resize", updateRailPosition);
      observer.disconnect();
    };
  }, [crossSells.length, cart?.items.length]);

  if (!cart && loadError) {
    return <StateMessage imageSrc="/images/illustration-failed.png" title="سبد خرید در دسترس نیست" subtitle={loadError} />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <StateMessage
        imageSrc="/images/empty-basket.png"
        title="سبد خرید شما خالی است"
        subtitle="برای انتخاب هدیه، محصولات کادوچی را ببینید."
        actions={<Button asChild size="large" variant="primary-filled"><Link href="/products">مشاهده محصولات</Link></Button>}
      />
    );
  }

  return (
    <div ref={pageRef} className="mx-auto flex min-h-[calc(100dvh-var(--spacing-88))] w-full max-w-[580px] flex-col pb-[calc(var(--spacing-128)+max(env(safe-area-inset-bottom),var(--spacing-24)))] [direction:rtl]">
      <div className="flex flex-1 flex-col px-16 pt-12">
        {loadError || error ? <Alert className="mb-12" tone="error" onDismiss={dismissError}>{error ?? loadError}</Alert> : null}
        <div ref={cartLinesRef}>
          {cart.items.filter((item) => !item.isCrossSell).map((item, index, items) => {
            const pending = pendingItems.has(item.key);
            const disabled = pending || !item.quantityLimits.editable;
            return (
              <div key={item.key}>
                <article className="flex flex-row-reverse items-center gap-8 bg-surface-background py-12">
                  <InputStepper
                    aria-label={`تعداد ${item.name}`}
                    decrementLabel="کاهش تعداد"
                    disabled={disabled}
                    incrementLabel="افزایش تعداد"
                    max={item.quantityLimits.maximum}
                    min={item.quantityLimits.minimum}
                    onRemove={() => remove(item.key)}
                    onValueChange={(quantity) => changeQuantity(item.key, quantity)}
                    removeLabel={`حذف ${item.name}`}
                    size="sm"
                    step={item.quantityLimits.multipleOf}
                    value={item.quantity}
                    variant="subtle"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-title-14 font-bold text-surface-neutral-high-emphasis">{item.name}</h2>
                    {item.fastDeliveryEligible ? <p className="mt-4 text-label-12 text-success">ارسال سریع در تهران</p> : null}
                    <div className="mt-4">
                      <NormalPrice amount={tomanAmount(item.lineSubtotal)} size="M" />
                    </div>
                  </div>
                  <div className="flex size-64 shrink-0 items-center justify-center overflow-hidden rounded-m bg-surface-soft">
                    {item.imageUrl ? <img alt="" className="size-full object-cover" src={item.imageUrl} /> : null}
                  </div>
                </article>
                {index < items.length - 1 ? <Divider /> : null}
              </div>
            );
          })}
        </div>
        <div
          ref={crossSellsRef}
          className={isDesktopRailFixed
            ? "mt-auto fixed inset-x-0 bottom-[calc(var(--spacing-128)+max(env(safe-area-inset-bottom),var(--spacing-24)))] z-30 mx-auto w-full max-w-[580px]"
            : "mt-auto"}
        >
          <CartCrossSells
            cartItems={cart.items}
            pendingItems={pendingItems}
            products={crossSells}
            onAdd={addCrossSell}
            onRemove={remove}
          />
        </div>
      </div>
      <div ref={summaryRef} className="fixed inset-x-0 bottom-0 z-40 border-t border-border-mid-emphasis bg-surface-background px-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))] pt-16">
        <div className="mx-auto max-w-[580px]">
          <SumPrice amount={tomanAmount(cart.totals.totalItems)} label="جمع کل" separate />
          <Button asChild className="mt-12 w-full" size="large" variant="primary-filled">
            <Link href="/checkout">ادامه فرایند خرید</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function cartSourceKey(cart: Cart | null) {
  return cart?.items.filter((item) => !item.isCrossSell).map((item) => item.productId).sort((left, right) => left - right).join(",") ?? "";
}
