"use client";

import React from "react";
import NormalPrice from "./Normal/NormalPrice";
import DiscountPrice, {
  type DiscountSize,
  type Orientation,
} from "./Discount/DiscountPrice";

export type PriceProps = {
  current: number;
  previous?: number | null;
  offPercent?: number | null;
  size?: DiscountSize;
  orientation?: Orientation;
  currencyLabel?: string;
  showArrowOnLargeH?: boolean;
};

export default function Price({
  current,
  previous,
  offPercent,
  size = "M",
  orientation = "vertical",
  currencyLabel = "تومان",
  showArrowOnLargeH = false,
}: PriceProps) {
  const hasDiscount =
    previous != null && offPercent != null && Number(offPercent) > 0;

  if (hasDiscount) {
    return (
      <DiscountPrice
        current={current}
        previous={previous as number}
        offPercent={offPercent as number}
        size={size}
        orientation={orientation}
        currencyLabel={currencyLabel}
        showArrowOnLargeH={showArrowOnLargeH}
      />
    );
  }

  return (
    <NormalPrice amount={current} size={size} currencyLabel={currencyLabel} />
  );
}
