"use client";

import React from "react";
import s from "./SumPrice.module.css";

export type Orientation = "horizontal" | "vertical";

export type SumPriceProps = {
  amount: number;
  label?: string;
  currencyLabel?: string;
  orientation?: Orientation;
  separate?: boolean;
};

function format(n: number) {
  return n.toLocaleString("fa-IR");
}

export default function SumPrice({
  amount,
  label = "جمع کل",
  currencyLabel = "تومان",
  orientation = "horizontal",
  separate = false,
}: SumPriceProps) {
  if (orientation === "horizontal") {
    return (
      <div className={`${s.root} ${s.h} ${separate ? s.hSplit : ""}`}>
        <span className={s.sumLabel}>{label}</span>

        <div className={s.priceWrap}>
          <span className={s.amount}>{format(amount)}</span>
          <span className={s.currency}>{currencyLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${s.root} ${s.v}`}>
      <span className={s.sumLabel}>{label}</span>
      <div className={s.priceWrapRight}>
        <span className={s.amount}>{format(amount)}</span>
        <span className={s.currency}>{currencyLabel}</span>
      </div>
    </div>
  );
}
