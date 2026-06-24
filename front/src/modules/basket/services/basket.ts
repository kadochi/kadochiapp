export function calculateSubtotal(
  lines: Array<{ price: number; qty: number }>,
): number {
  return lines.reduce((sum, l) => sum + l.price * l.qty, 0);
}

export function formatPriceIRT(price: number): string {
  return Math.round(price / 10).toLocaleString("fa-IR");
}

const STORAGE_KEY = "kadochi:basket:v1";

export type { BasketMap } from "../types";

export function getBasketFromStorage(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function saveBasketToStorage(basket: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(basket));
  } catch {}
}
