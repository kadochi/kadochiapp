"use client";

import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputStepper } from "@/components/ui/input-stepper";
import { NormalPrice, SumPrice } from "@/components/layout/price";
import StateMessage from "@/components/layout/state-message";
import { tomanAmount } from "../utils/money";
import { useCart } from "../hooks/use-cart";
import type { Cart } from "../types";

export function BasketPage({ initialCart, loadError }: { initialCart: Cart | null; loadError?: string }) {
  const { cart, error, pendingItems, changeQuantity, remove, dismissError } = useCart(initialCart);

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
    <div className="mx-auto w-full max-w-[580px] pb-[calc(var(--spacing-128)+max(env(safe-area-inset-bottom),var(--spacing-24)))] [direction:rtl]">
      <div className="space-y-12 px-16 pt-12">
        {loadError || error ? <Alert tone="error" onDismiss={dismissError}>{error ?? loadError}</Alert> : null}
        {cart.items.map((item) => {
          const pending = pendingItems.has(item.key);
          const disabled = pending || !item.quantityLimits.editable;
          return (
            <article key={item.key} className="flex flex-row-reverse items-center gap-8 rounded-l border-b border-border-low-emphasis bg-surface-background py-12">
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
                  <NormalPrice amount={tomanAmount(item.lineTotal)} size="M" />
                </div>
              </div>
              <div className="flex size-64 shrink-0 items-center justify-center overflow-hidden rounded-m bg-surface-soft">
                {item.imageUrl ? <img alt="" className="size-full object-cover" src={item.imageUrl} /> : null}
              </div>
            </article>
          );
        })}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-mid-emphasis bg-surface-background px-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))] pt-16">
        <div className="mx-auto max-w-[580px]">
          <SumPrice amount={tomanAmount(cart.totals.totalPrice)} label="جمع کل" separate />
          <Button asChild className="mt-12 w-full" size="large" variant="primary-filled">
            <Link href="/checkout">ادامه فرایند خرید</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
