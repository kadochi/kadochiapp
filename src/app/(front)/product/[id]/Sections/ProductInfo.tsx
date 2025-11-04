"use client";

import React from "react";
import s from "./ProductInfo.module.css";

import NormalPrice from "@/components/layout/Price/Normal/NormalPrice";
import DiscountPrice from "@/components/layout/Price/Discount/DiscountPrice";

import { Clock, MessageSquare, Star } from "lucide-react";

type Unit = "rial" | "toman";

type Props = {
  title: string;
  amount: number;
  previous?: number | null;
  offPercent?: number | null;
  currencyLabel?: string;
  shippingLabel?: string;
  reviewsCount?: number;
  ratingAvg?: number;
  inputUnit?: Unit;
};

function toDisplayToman(
  n: number | null | undefined,
  unit: Unit
): number | null {
  if (n == null) return null;
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  return unit === "rial" ? Math.round(num / 10) : num;
}

export default function ProductInfo({
  title,
  amount,
  previous = null,
  offPercent = null,
  currencyLabel = "تومان",
  shippingLabel = "ارسال ۱ روزکاری",
  reviewsCount = 2,
  ratingAvg = 4.5,
  inputUnit = "rial",
}: Props) {
  // نرمال‌سازی به تومان برای نمایش
  const displayAmount = toDisplayToman(amount, inputUnit) ?? 0;
  const displayPrevious = toDisplayToman(previous, inputUnit);

  const hasDiscount =
    displayPrevious != null &&
    Number(displayPrevious) > 0 &&
    offPercent != null &&
    Number(offPercent) > 0;

  return (
    <section className={s.root} aria-labelledby="pdp-title">
      <h1 id="pdp-title" className={s.title}>
        {title}
      </h1>

      <div className={s.priceWrap} aria-label="قیمت">
        {hasDiscount ? (
          <DiscountPrice
            current={displayAmount}
            previous={Number(displayPrevious)}
            offPercent={Number(offPercent)}
            size="L"
            orientation="horizontal"
            showArrowOnLargeH
            currencyLabel={currencyLabel}
          />
        ) : (
          <NormalPrice
            amount={displayAmount}
            size="L"
            currencyLabel={currencyLabel}
          />
        )}
      </div>

      <div className={s.metaRow} role="list" aria-label="اطلاعات محصول">
        <div className={s.metaItem} role="listitem">
          <Clock size={24} className={s.iconGreen} aria-hidden />
          <span className={s.metaTextGreen}>{shippingLabel}</span>
        </div>

        <div className={s.metaItem} role="listitem">
          <MessageSquare size={24} className={s.icon} aria-hidden />
          <span className={s.metaText}>
            نظر {Number(reviewsCount).toLocaleString("fa-IR")}
          </span>
        </div>

        <div className={s.metaItem} role="listitem">
          <Star size={24} className={s.icon} aria-hidden />
          <span className={s.metaText}>
            امتیاز{" "}
            {Number(ratingAvg).toLocaleString("fa-IR", {
              maximumFractionDigits: 1,
            })}
          </span>
        </div>
      </div>
    </section>
  );
}
