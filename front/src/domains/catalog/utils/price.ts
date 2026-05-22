// Price normalization helpers: IRR (Rial) vs IRT (Toman)
import type { Currency, Price } from "../models/product";

export function parseAmount(input: string | number): number {
  if (typeof input === "number") return input;
  const n = Number(String(input).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function toPrice(amount: number, currency: Currency): Price {
  return { amount, currency };
}

// Convert Woo string prices (in IRR by default) to domain Price in IRT if desired
export function irrToIrt(irr: number): number {
  return Math.round(irr / 10);
}

export function pickCurrency(preferred?: Currency): Currency {
  return preferred ?? "IRT"; // default to Toman in Iran market
}
