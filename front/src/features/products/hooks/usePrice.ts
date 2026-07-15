import type { Product } from "../types";

type Money = Product["price"];

export type UsePriceInput = Pick<Product, "price" | "regularPrice">;

export type UsePriceResult = {
  current: number;
  previous: number | null;
  offPercent: number | null;
  hasDiscount: boolean;
};

function toDisplayAmount(money: Money): number {
  return Number(money.amount) / 10 ** money.minorUnit;
}

/** Derives display amounts and discount values from product money fields. */
export function usePrice({ price, regularPrice }: UsePriceInput): UsePriceResult {
  const hasDiscount =
    regularPrice != null && Number(regularPrice.amount) > Number(price.amount);

  const current = toDisplayAmount(price);
  const previous = hasDiscount ? toDisplayAmount(regularPrice) : null;
  const offPercent =
    hasDiscount && previous ? Math.round((1 - current / previous) * 100) : null;

  return { current, previous, offPercent, hasDiscount };
}
