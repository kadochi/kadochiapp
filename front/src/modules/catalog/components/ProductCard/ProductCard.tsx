"use client";

import React from "react";
import { cn } from "@/lib/cn";
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
    <a className="no-underline text-inherit w-full block" href={href} dir="rtl">
      <div className="relative grid place-items-center w-full aspect-[1/1.2] overflow-hidden rounded-[16px]">
        <img
          className="absolute inset-0 w-full h-full object-cover block"
          src={imageSrc}
          alt={title}
          loading={isFirst ? "eager" : "lazy"}
          fetchPriority={isFirst ? "high" : "auto"}
        />
      </div>

      <div className="px-4 pb-4 pt-2 text-center">
        <div
          className={cn(
            "text-[var(--surface-neutral-high-emphasis)]",
            "font-sans text-sm leading-[1.4] font-bold mb-3",
            "line-clamp-2 overflow-hidden text-ellipsis h-[calc(1.4*2*14px)]"
          )}
          title={title}
        >
          {title}
        </div>

        <div className="flex justify-center">
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
            <div className="text-[var(--surface-neutral-low-emphasis)] font-sans text-sm leading-[1.4] font-normal inline-flex items-baseline justify-center gap-1.5">
              ناموجود
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
