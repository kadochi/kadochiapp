"use client";

import React from "react";
import s from "./ProductCard.module.css";
import { Price } from "@/components/layout/Price";
import { rialToToman } from "@/lib/money";

type Props = {
  href?: string;
  title: string;
  imageSrc: string;
  price: number | string | null | undefined;
  previousPrice?: number | string | null;
  offPercent?: number | null;
  currencyLabel?: string;
  stockStatus?: string;
  isInStock?: boolean | "instock" | "outofstock";
  isFirst?: boolean;
};

export default function ProductCard({
  href = "#",
  title,
  imageSrc,
  price,
  previousPrice = null,
  offPercent = null,
  currencyLabel = "تومان",
  stockStatus,
  isInStock,
  isFirst = false,
}: Props) {
  const normalizedInStock =
    typeof isInStock === "string"
      ? isInStock.toLowerCase() === "instock"
      : isInStock;

  const computedInStock =
    stockStatus?.toLowerCase() === "instock"
      ? true
      : stockStatus?.toLowerCase() === "outofstock"
      ? false
      : normalizedInStock ?? true;

  const hasPrice =
    price !== null &&
    price !== undefined &&
    Number(price) > 0 &&
    !Number.isNaN(Number(price));

  const showPrice = computedInStock && hasPrice;

  const isToman = /(تومان|تومن)/.test(currencyLabel || "");
  const currentDisplay = hasPrice
    ? isToman
      ? rialToToman(Number(price))
      : Number(price)
    : null;

  const prevDisplay =
    previousPrice != null && Number(previousPrice) > 0
      ? isToman
        ? rialToToman(Number(previousPrice))
        : Number(previousPrice)
      : null;

  return (
    <a className={s.card} href={href} dir="rtl">
      <div className={s.imgWrap}>
        <img
          className={s.image}
          src={imageSrc}
          alt={title}
          loading={isFirst ? "eager" : "lazy"}
          fetchPriority={isFirst ? "high" : "auto"}
        />
      </div>

      <div className={s.info}>
        <div className={s.title} title={title}>
          {title}
        </div>

        <div className={s.priceBox}>
          {showPrice ? (
            <Price
              current={currentDisplay!}
              previous={prevDisplay}
              offPercent={offPercent ?? null}
              size="M"
              orientation="vertical"
              currencyLabel={currencyLabel}
            />
          ) : (
            <div className={s.outofstock}>ناموجود</div>
          )}
        </div>
      </div>
    </a>
  );
}
