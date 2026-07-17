"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { InputStepper } from "@/components/ui/input-stepper";
import StateMessage from "@/components/layout/state-message";
import { formatIrrAsToman } from "../utils/money";
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
    <div className="mx-auto w-full max-w-[640px] pb-128 [direction:rtl]">
      <div className="space-y-12 px-16 pt-12">
        {loadError || error ? <Alert tone="error" onDismiss={dismissError}>{error ?? loadError}</Alert> : null}
        {cart.items.map((item) => {
          const pending = pendingItems.has(item.key);
          const disabled = pending || !item.quantityLimits.editable;
          return (
            <article key={item.key} className="flex gap-12 rounded-l border border-border-low-emphasis bg-surface-background p-12">
              <div className="flex size-88 shrink-0 items-center justify-center overflow-hidden rounded-m bg-surface-soft">
                {item.imageUrl ? <img alt="" className="size-full object-cover" src={item.imageUrl} /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="line-clamp-2 text-title-14 font-bold text-surface-neutral-high-emphasis">{item.name}</h2>
                {item.fastDeliveryEligible ? <p className="mt-4 text-label-12 text-success">ارسال سریع در تهران</p> : null}
                <p className="mt-8 text-label-14 font-bold text-surface-neutral-high-emphasis">{formatIrrAsToman(item.lineTotal)}</p>
                <div className="mt-12 flex items-center justify-between gap-8">
                  <InputStepper
                    aria-label={`تعداد ${item.name}`}
                    decrementLabel="کاهش تعداد"
                    incrementLabel="افزایش تعداد"
                    disabled={disabled}
                    max={item.quantityLimits.maximum}
                    min={item.quantityLimits.minimum}
                    onRemove={() => remove(item.key)}
                    onValueChange={(quantity) => changeQuantity(item.key, quantity)}
                    size="sm"
                    step={item.quantityLimits.multipleOf}
                    value={item.quantity}
                    variant="outline"
                  />
                  <button
                    aria-label={`حذف ${item.name}`}
                    className="inline-flex size-32 items-center justify-center rounded-rounded text-error disabled:opacity-40"
                    disabled={disabled}
                    onClick={() => remove(item.key)}
                    type="button"
                  >
                    <Trash2 className="size-20" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-low-emphasis bg-surface-background px-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-16))] pt-12 shadow-[0_-8px_24px_rgba(0,0,0,.06)]">
        <div className="mx-auto max-w-[640px]">
          <div className="mb-12 flex items-center justify-between text-label-14 text-surface-neutral-mid-emphasis">
            <span>جمع کالاها</span><span>{formatIrrAsToman(cart.totals.totalItems)}</span>
          </div>
          <Divider />
          <div className="my-12 flex items-center justify-between">
            <span className="text-title-16 font-bold">مبلغ قابل پرداخت</span>
            <span className="text-title-16 font-extrabold">{formatIrrAsToman(cart.totals.totalPrice)}</span>
          </div>
          <Button asChild className="w-full" size="large" variant="primary-filled">
            <Link href="/checkout">ادامه و ثبت سفارش</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
