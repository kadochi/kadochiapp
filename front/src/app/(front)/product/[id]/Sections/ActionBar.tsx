// src/app/(front)/product/[id]/Sections/ActionBar.tsx
"use client";

import React from "react";
import s from "./ActionBar.module.css";

import Button from "@/components/ui/Button/Button";
import InputStepper from "@/components/ui/InputStepper/InputStepper";
import NormalPrice from "@/components/layout/Price/Normal/NormalPrice";
import DiscountPrice from "@/components/layout/Price/Discount/DiscountPrice";
import { useBasket } from "@/domains/basket/state/basket-context";

type Props = {
  productId: string | number;
  amount: number;
  previous?: number | null;
  offPercent?: number | null;
  currencyLabel?: string;
  inStock?: boolean;

  min?: number;
  max?: number;
  initialQty?: number;
  onChangeQty?: (v: number) => void;
  onAdd?: () => void;
};

export default function ActionBar({
  productId,
  amount,
  previous = null,
  offPercent = null,
  currencyLabel = "تومان",
  inStock = true,
  min = 1,
  max = 9,
  initialQty = 0,
  onChangeQty,
  onAdd,
}: Props) {
  const id = String(productId);
  const { basket, addToBasket, setItemQuantity, removeFromBasket } =
    useBasket();

  const [mounted, setMounted] = React.useState(false);
  const [qty, setQty] = React.useState<number>(0);

  React.useEffect(() => {
    setMounted(true);
    const start = basket[id] ?? initialQty ?? 0;
    setQty(Math.max(0, start));
  }, []);

  const basketQty = basket[id] ?? 0;
  React.useEffect(() => {
    if (!mounted) return;
    setQty(Math.max(0, basketQty));
  }, [basketQty, mounted]);

  const hasDiscount =
    previous != null &&
    Number(previous) > 0 &&
    offPercent != null &&
    Number(offPercent) > 0;

  const amountIRT = Math.trunc((amount || 0) / 10);
  const previousIRT = previous != null ? Math.trunc(previous / 10) : null;

  const handleAdd = () => {
    const next = Math.max(min, 1);
    setQty(next);
    addToBasket(id, next);
    onChangeQty?.(next);
    onAdd?.();
  };

  const handleQty = (nextVal: number | null | undefined) => {
    const v =
      typeof nextVal === "number" && Number.isFinite(nextVal) ? nextVal : 0;

    if (v <= 0) {
      setQty(0);
      removeFromBasket(id, Number.POSITIVE_INFINITY);
      onChangeQty?.(0);
      return;
    }

    const clamped = Math.max(min, Math.min(max, v));
    setQty(clamped);
    setItemQuantity(id, clamped);
    onChangeQty?.(clamped);
  };

  const showStepper = mounted && qty > 0;

  return (
    <div className={s.root} role="region" aria-label="نوار اقدام">
      <div className={s.inner}>
        <div className={s.priceCell} aria-label="قیمت">
          {hasDiscount ? (
            <DiscountPrice
              current={amountIRT}
              previous={Number(previousIRT ?? 0)}
              offPercent={Number(offPercent)}
              size="L"
              orientation="vertical"
              showArrowOnLargeH
              currencyLabel={currencyLabel}
            />
          ) : (
            <NormalPrice
              amount={amountIRT}
              size="L"
              currencyLabel={currencyLabel}
            />
          )}
        </div>

        <div className={s.ctaCell}>
          {!inStock ? (
            <span className={s.outOfStock} aria-label="ناموجود">
              ناموجود
            </span>
          ) : showStepper ? (
            <InputStepper
              type="product"
              min={min}
              max={max}
              value={qty}
              onChange={handleQty}
            />
          ) : (
            <Button
              type="primary"
              style="filled"
              size="large"
              fullWidth
              onClick={handleAdd}
              aria-label="افزودن به سبد خرید"
            >
              افزودن به سبد خرید
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
