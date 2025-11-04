"use client";

import React from "react";
import s from "./NormalPrice.module.css";

export type NormalSize = "L" | "M";

export type NormalPriceProps = {
  amount: number;
  size?: NormalSize;
  className?: string;
  currencyLabel?: string;
};

function cx(...a: Array<string | false | undefined>) {
  return a.filter(Boolean).join(" ");
}
const formatPrice = (n: number) =>
  new Intl.NumberFormat("fa-IR").format(Math.max(0, Math.floor(n)));

export default function NormalPrice({
  amount,
  size = "L",
  className,
  currencyLabel = "تومان",
}: NormalPriceProps) {
  return (
    <span
      className={cx(s.root, size === "M" ? s.sizeM : s.sizeL, className)}
      dir="rtl"
    >
      <span className={s.amount}>{formatPrice(amount)}</span>
      <span className={s.currency}>{currencyLabel}</span>
    </span>
  );
}
