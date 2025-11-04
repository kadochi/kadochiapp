"use client";

import React from "react";
import s from "./DiscountPrice.module.css";

export type DiscountSize = "L" | "M";
export type Orientation = "horizontal" | "vertical";

export type DiscountPriceProps = {
  current: number;
  previous: number;
  offPercent: number;
  size?: DiscountSize;
  orientation?: Orientation;
  currencyLabel?: string;
  showArrowOnLargeH?: boolean;
};

function format(n: number) {
  return n.toLocaleString("fa-IR");
}

export default function DiscountPrice({
  current,
  previous,
  offPercent,
  size = "L",
  orientation = "horizontal",
  currencyLabel = "تومان",
  showArrowOnLargeH = false,
}: DiscountPriceProps) {
  const isL = size === "L";
  const isH = orientation === "horizontal";

  if (isH) {
    return (
      <div className={`${s.root} ${s[`size_${size}`]} ${s.h}`} dir="rtl">
        <div className={s.prevWrap}>
          <span className={s.prev}>{format(previous)}</span>
          <span className={s.currLabel}>{currencyLabel}</span>
        </div>

        <span className={s.badge}>{format(offPercent)}٪</span>

        {isL && showArrowOnLargeH ? (
          <span className={s.arrow} aria-hidden>
            <svg viewBox="0 0 24 24" className={s.arrowIcon}>
              <path
                d="M14.7 6.3 9 12l5.7 5.7 1.4-1.4L11.8 12l4.3-4.3-1.4-1.4z"
                fill="currentColor"
              />
            </svg>
          </span>
        ) : null}

        <div className={s.currWrap}>
          <span className={s.curr}>{format(current)}</span>
          <span className={s.currLabel}>{currencyLabel}</span>
        </div>
      </div>
    );
  }

  const verticalClass = size === "L" ? s.vRight : s.vCenter;

  return (
    <div
      className={`${s.root} ${s[`size_${size}`]} ${s.v} ${verticalClass}`}
      dir="rtl"
    >
      {size === "L" ? (
        <>
          <div className={s.prevWrapRight}>
            <span className={s.prev}>{format(previous)}</span>
            <span className={s.currLabel}>{currencyLabel}</span>
            <span className={s.badge}>{format(offPercent)}٪</span>
          </div>

          <div className={s.currLine}>
            <div className={s.currWrap}>
              <span className={s.curr}>{format(current)}</span>
              <span className={s.currLabel}>{currencyLabel}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={s.currLineCenter}>
            <div className={s.currWrap}>
              <span className={s.curr}>{format(current)}</span>
              <span className={s.currLabel}>{currencyLabel}</span>
            </div>
          </div>

          <div className={s.prevWrap}>
            <span className={s.prev}>{format(previous)}</span>
            <span className={s.currLabel}>{currencyLabel}</span>
            <span className={s.badge}>{format(offPercent)}٪</span>
          </div>
        </>
      )}
    </div>
  );
}
