import type { z } from "zod";

import type { moneySchema } from "../schema/cart";

type Money = z.infer<typeof moneySchema>;

/**
 * Woo returns IRR in its smallest currency unit. Kadochi presents all
 * authoritative Woo amounts in Toman, without recalculating totals in-browser.
 */
export function irrToToman(money: Money): number {
  const minorAmount = Number(money.amount);
  if (!Number.isFinite(minorAmount)) return Number.MAX_SAFE_INTEGER;
  if (money.currencyCode !== "IRR") return Math.floor(minorAmount);
  return Math.floor(minorAmount / (10 ** money.minorUnit) / 10);
}

export function tomanAmount(money: Money): number {
  const amount = irrToToman(money);
  return Math.min(amount, Number.MAX_SAFE_INTEGER);
}

export function formatIrrAsToman(money: Money): string {
  return `${new Intl.NumberFormat("fa-IR").format(irrToToman(money))} تومان`;
}
